// IWOS Global Workforce Graph — shared graph primitives.
//
// The graph augments (never replaces) the relational schema. Every relational
// row can be projected into `woic_graph_entities` as a node keyed by
// `<entity_type>:<uuid>` and connected through `woic_graph_edges`.
//
// This module owns:
//   - node/edge upsert helpers (idempotent, tenant scoped)
//   - the projection layer that syncs relational rows into the graph
//   - the query-cache wrapper used by the graph API

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const nodeKey = (type: string, id: string) => `${type}:${id}`;

export interface NodeInput {
  entity_type: string;
  entity_key: string;
  label: string;
  ref_entity?: string | null;
  ref_id?: string | null;
  attributes?: Record<string, unknown>;
  weight?: number;
}

export interface EdgeInput {
  from_key: string;
  to_key: string;
  relation: string;
  weight?: number;
  confidence?: number;
  attributes?: Record<string, unknown>;
}

/** Idempotently upserts nodes and returns a key -> id map. */
export async function upsertNodes(
  db: SupabaseClient,
  agencyId: string,
  nodes: NodeInput[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!nodes.length) return map;

  const deduped = new Map<string, NodeInput>();
  for (const n of nodes) deduped.set(n.entity_key, n);
  const rows = [...deduped.values()].map((n) => ({
    agency_id: agencyId,
    entity_type: n.entity_type,
    entity_key: n.entity_key,
    label: n.label.slice(0, 300),
    ref_entity: n.ref_entity ?? null,
    ref_id: n.ref_id ?? null,
    attributes: n.attributes ?? {},
    weight: n.weight ?? 1,
    updated_at: new Date().toISOString(),
  }));

  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { data, error } = await db
      .from("woic_graph_entities")
      .upsert(chunk, { onConflict: "agency_id,entity_type,entity_key" })
      .select("id, entity_key");
    if (error) throw error;
    for (const r of data ?? []) map.set(r.entity_key as string, r.id as string);
  }
  return map;
}

/** Idempotently upserts edges given a key -> id map from `upsertNodes`. */
export async function upsertEdges(
  db: SupabaseClient,
  agencyId: string,
  edges: EdgeInput[],
  ids: Map<string, string>,
): Promise<number> {
  const rows = edges
    .map((e) => {
      const from = ids.get(e.from_key);
      const to = ids.get(e.to_key);
      if (!from || !to || from === to) return null;
      return {
        agency_id: agencyId,
        from_id: from,
        to_id: to,
        relation: e.relation,
        weight: e.weight ?? 1,
        confidence: e.confidence ?? 1,
        attributes: e.attributes ?? {},
      };
    })
    .filter(Boolean) as Record<string, unknown>[];

  const seen = new Set<string>();
  const unique = rows.filter((r) => {
    const k = `${r.from_id}|${r.to_id}|${r.relation}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  let written = 0;
  for (let i = 0; i < unique.length; i += 500) {
    const { error } = await db
      .from("woic_graph_edges")
      .upsert(unique.slice(i, i + 500), { onConflict: "agency_id,from_id,to_id,relation" });
    if (error) throw error;
    written += Math.min(500, unique.length - i);
  }
  return written;
}

// ---------------- projection (relational -> graph) ----------------

export interface SyncResult {
  nodes: number;
  edges: number;
  by_type: Record<string, number>;
}

/**
 * Projects the tenant's relational rows into the graph. Safe to run repeatedly:
 * every write is an upsert keyed on (agency, type, key).
 */
export async function syncAgencyGraph(
  db: SupabaseClient,
  agencyId: string,
  limitPerTable = 2000,
): Promise<SyncResult> {
  const nodes: NodeInput[] = [];
  const edges: EdgeInput[] = [];
  const byType: Record<string, number> = {};
  const track = (t: string) => (byType[t] = (byType[t] ?? 0) + 1);

  const push = (n: NodeInput) => {
    nodes.push(n);
    track(n.entity_type);
  };

  // Organization root
  const { data: agency } = await db
    .from("agencies")
    .select("id, name")
    .eq("id", agencyId)
    .maybeSingle();
  const orgKey = nodeKey("organization", agencyId);
  push({
    entity_type: "organization",
    entity_key: orgKey,
    label: (agency?.name as string) ?? "Organization",
    ref_entity: "agencies",
    ref_id: agencyId,
    weight: 5,
  });

  const [workers, skills, workerSkills, clients, sites, tickets, courses, placements] =
    await Promise.all([
      db.from("workers").select("id, first_name, last_name, trade, classification, osha_cert, nccer_cert, is_active").eq("agency_id", agencyId).limit(limitPerTable),
      db.from("skills").select("id, name, category").or(`agency_id.eq.${agencyId},is_global.eq.true`).limit(limitPerTable),
      db.from("worker_skills").select("worker_id, skill_id, proficiency, years_experience").limit(limitPerTable * 4),
      db.from("clients").select("id, company_name, is_active").eq("agency_id", agencyId).limit(limitPerTable),
      db.from("client_sites").select("id, client_id, site_name, site_code, city, state").limit(limitPerTable),
      db.from("tickets").select("id, ticket_number, job_title, status, worker_id, client_id, site_id, equipment_required, total_hours, work_date").eq("agency_id", agencyId).order("created_at", { ascending: false }).limit(limitPerTable),
      db.from("training_courses").select("id, title, category, required").eq("agency_id", agencyId).limit(limitPerTable),
      db.from("placements").select("id, worker_id, job_order_id, status, starts_on, ends_on").eq("agency_id", agencyId).limit(limitPerTable),
    ]);

  const workerIds = new Set((workers.data ?? []).map((w) => w.id as string));

  for (const w of workers.data ?? []) {
    const key = nodeKey("worker", w.id as string);
    push({
      entity_type: "worker",
      entity_key: key,
      label: `${w.first_name ?? ""} ${w.last_name ?? ""}`.trim() || "Worker",
      ref_entity: "workers",
      ref_id: w.id as string,
      attributes: {
        trade: w.trade,
        classification: w.classification,
        active: w.is_active,
      },
      weight: w.is_active ? 2 : 1,
    });
    edges.push({ from_key: key, to_key: orgKey, relation: "belongs_to" });

    for (const [cert, label] of [["osha_cert", "OSHA"], ["nccer_cert", "NCCER"]] as const) {
      if (w[cert]) {
        const ck = nodeKey("certification", `${label}`);
        push({ entity_type: "certification", entity_key: ck, label, weight: 2 });
        edges.push({ from_key: key, to_key: ck, relation: "has_certification" });
      }
    }
    if (w.trade) {
      const sk = nodeKey("skill", String(w.trade).toLowerCase());
      push({ entity_type: "skill", entity_key: sk, label: String(w.trade) });
      edges.push({ from_key: key, to_key: sk, relation: "has_skill", weight: 1.5 });
    }
  }

  for (const s of skills.data ?? []) {
    push({
      entity_type: "skill",
      entity_key: nodeKey("skill", s.id as string),
      label: (s.name as string) ?? "Skill",
      ref_entity: "skills",
      ref_id: s.id as string,
      attributes: { category: s.category },
    });
  }

  for (const ws of workerSkills.data ?? []) {
    if (!workerIds.has(ws.worker_id as string)) continue;
    edges.push({
      from_key: nodeKey("worker", ws.worker_id as string),
      to_key: nodeKey("skill", ws.skill_id as string),
      relation: "has_skill",
      weight: 1 + Number(ws.years_experience ?? 0) / 10,
      attributes: { proficiency: ws.proficiency },
    });
  }

  const clientIds = new Set((clients.data ?? []).map((c) => c.id as string));
  for (const c of clients.data ?? []) {
    const key = nodeKey("client", c.id as string);
    push({
      entity_type: "client",
      entity_key: key,
      label: (c.company_name as string) ?? "Client",
      ref_entity: "clients",
      ref_id: c.id as string,
      attributes: { active: c.is_active },
      weight: 3,
    });
    edges.push({ from_key: orgKey, to_key: key, relation: "serves" });
  }

  for (const s of sites.data ?? []) {
    if (!clientIds.has(s.client_id as string)) continue;
    const key = nodeKey("facility", s.id as string);
    push({
      entity_type: "facility",
      entity_key: key,
      label: (s.site_name as string) ?? (s.site_code as string) ?? "Site",
      ref_entity: "client_sites",
      ref_id: s.id as string,
      attributes: { city: s.city, state: s.state },
    });
    edges.push({ from_key: nodeKey("client", s.client_id as string), to_key: key, relation: "owns" });
    if (s.city) {
      const ck = nodeKey("city", String(s.city).toLowerCase());
      push({ entity_type: "city", entity_key: ck, label: String(s.city) });
      edges.push({ from_key: key, to_key: ck, relation: "in_city" });
      if (s.state) {
        const stk = nodeKey("state", String(s.state).toLowerCase());
        push({ entity_type: "state", entity_key: stk, label: String(s.state) });
        edges.push({ from_key: ck, to_key: stk, relation: "in_state" });
      }
    }
  }

  for (const t of tickets.data ?? []) {
    const key = nodeKey("project", t.id as string);
    push({
      entity_type: "project",
      entity_key: key,
      label: (t.job_title as string) || (t.ticket_number as string) || "Assignment",
      ref_entity: "tickets",
      ref_id: t.id as string,
      attributes: {
        status: t.status,
        hours: t.total_hours,
        work_date: t.work_date,
        ticket_number: t.ticket_number,
      },
      weight: 1 + Number(t.total_hours ?? 0) / 40,
    });
    if (t.worker_id && workerIds.has(t.worker_id as string)) {
      edges.push({
        from_key: nodeKey("worker", t.worker_id as string),
        to_key: key,
        relation: "worked_on",
        weight: 1 + Number(t.total_hours ?? 0) / 40,
        attributes: { status: t.status },
      });
    }
    if (t.client_id && clientIds.has(t.client_id as string)) {
      edges.push({ from_key: key, to_key: nodeKey("client", t.client_id as string), relation: "assigned_to" });
    }
    if (t.site_id) {
      edges.push({ from_key: key, to_key: nodeKey("facility", t.site_id as string), relation: "located_at" });
    }
    if (t.job_title) {
      const sk = nodeKey("skill", String(t.job_title).toLowerCase());
      push({ entity_type: "skill", entity_key: sk, label: String(t.job_title) });
      edges.push({ from_key: key, to_key: sk, relation: "requires_skill" });
    }
    const equipment = String(t.equipment_required ?? "")
      .split(/[,;/]|\band\b/i)
      .map((e) => e.trim())
      .filter((e) => e.length > 1 && e.length < 60)
      .slice(0, 8);
    for (const eq of equipment) {
      const ek = nodeKey("equipment", eq.toLowerCase());
      push({ entity_type: "equipment", entity_key: ek, label: eq });
      edges.push({ from_key: key, to_key: ek, relation: "uses" });
      if (t.worker_id && workerIds.has(t.worker_id as string)) {
        edges.push({ from_key: nodeKey("worker", t.worker_id as string), to_key: ek, relation: "operates" });
      }
    }
  }

  for (const c of courses.data ?? []) {
    const key = nodeKey("training", c.id as string);
    push({
      entity_type: "training",
      entity_key: key,
      label: (c.title as string) ?? "Training",
      ref_entity: "training_courses",
      ref_id: c.id as string,
      attributes: { category: c.category, required: c.required },
    });
    if (c.category) {
      const sk = nodeKey("skill", String(c.category).toLowerCase());
      push({ entity_type: "skill", entity_key: sk, label: String(c.category) });
      edges.push({ from_key: key, to_key: sk, relation: "grants_skill" });
    }
  }

  for (const p of placements.data ?? []) {
    if (!p.worker_id || !workerIds.has(p.worker_id as string)) continue;
    const key = nodeKey("job", p.job_order_id ? String(p.job_order_id) : (p.id as string));
    push({
      entity_type: "job",
      entity_key: key,
      label: `Job order ${String(p.job_order_id ?? p.id).slice(0, 8)}`,
      ref_entity: "placements",
      ref_id: p.id as string,
      attributes: { status: p.status, starts_on: p.starts_on, ends_on: p.ends_on },
    });
    edges.push({ from_key: nodeKey("worker", p.worker_id as string), to_key: key, relation: "worked_on" });
  }

  // Colleague inference: workers who served the same client become KNOWS peers.
  const byClient = new Map<string, Set<string>>();
  for (const t of tickets.data ?? []) {
    if (!t.client_id || !t.worker_id) continue;
    const set = byClient.get(t.client_id as string) ?? new Set<string>();
    set.add(t.worker_id as string);
    byClient.set(t.client_id as string, set);
  }
  for (const [, workersAtClient] of byClient) {
    const list = [...workersAtClient].slice(0, 40);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        edges.push({
          from_key: nodeKey("worker", list[i]),
          to_key: nodeKey("worker", list[j]),
          relation: "knows",
          confidence: 0.6,
          attributes: { inferred: "shared_client" },
        });
      }
    }
  }

  const ids = await upsertNodes(db, agencyId, nodes);
  const edgeCount = await upsertEdges(db, agencyId, edges, ids);
  return { nodes: ids.size, edges: edgeCount, by_type: byType };
}

// ---------------- query cache ----------------

export function graphCacheKey(api: string, params: unknown): string {
  const raw = `${api}:${JSON.stringify(params ?? {})}`;
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${api}:${(h >>> 0).toString(36)}`;
}

export async function withGraphCache<T>(
  db: SupabaseClient,
  agencyId: string,
  api: string,
  params: unknown,
  ttlSeconds: number,
  producer: () => Promise<T>,
): Promise<{ data: T; cached: boolean }> {
  const key = graphCacheKey(api, params);
  const { data: hit } = await db
    .from("woic_graph_query_cache")
    .select("result, expires_at")
    .eq("agency_id", agencyId)
    .eq("query_key", key)
    .maybeSingle();
  if (hit && new Date(hit.expires_at as string).getTime() > Date.now()) {
    return { data: hit.result as T, cached: true };
  }
  const data = await producer();
  await db.from("woic_graph_query_cache").upsert(
    {
      agency_id: agencyId,
      query_key: key,
      api,
      result: data as unknown as Record<string, unknown>,
      expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    },
    { onConflict: "agency_id,query_key" },
  );
  return { data, cached: false };
}
