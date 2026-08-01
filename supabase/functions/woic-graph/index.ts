// woic-graph — the IWOS Global Workforce Graph API (Generation One).
//
// POST { agency_id, operation, params }
//
// Primitive operations (thin wrappers over the SQL graph engine):
//   taxonomy            node + relationship taxonomy
//   sync                project relational rows into the graph (idempotent)
//   subgraph            nodes + edges for visualization (supports time travel)
//   neighbors           n-hop neighbourhood expansion
//   shortest_path       shortest relationship path between two nodes
//   similar             shared-neighbour similarity
//   influence           weighted degree centrality
//   communities         connected-component community detection
//   risk_propagation    decayed risk spread from a source node
//   resolve             resolve a relational row (entity + id) to a graph node
//
// Composite graph APIs (business semantics on top of the primitives):
//   find_similar_workers, find_missing_skills, find_hidden_experts,
//   find_career_paths, find_team_dependencies, find_organizational_risks,
//   find_knowledge_clusters, find_success_patterns, find_high_risk_projects,
//   find_compliance_chains, find_equipment_dependencies,
//   find_workforce_bottlenecks
//
// Every operation is tenant scoped: agency membership is verified before any
// data access and every query is filtered by agency_id.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { withSentry } from "../_shared/sentry.ts";
import { jsonResponse, requireUser } from "../_shared/auth.ts";
import { admin, isUuid, requireAgencyMember } from "../_shared/woic.ts";
import { logCognitiveRequest } from "../_shared/woic-cognitive.ts";
import { syncAgencyGraph, withGraphCache } from "../_shared/woic-graph.ts";

type Params = Record<string, unknown>;
type Db = ReturnType<typeof admin>;

const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.slice(0, max) : "");
const strArr = (v: unknown): string[] | null =>
  Array.isArray(v) && v.length ? v.filter((x) => typeof x === "string").slice(0, 40) as string[] : null;

const PRIMITIVES = new Set([
  "taxonomy", "sync", "subgraph", "neighbors", "shortest_path", "similar",
  "influence", "communities", "risk_propagation", "resolve",
]);
const APIS = new Set([
  "find_similar_workers", "find_missing_skills", "find_hidden_experts",
  "find_career_paths", "find_team_dependencies", "find_organizational_risks",
  "find_knowledge_clusters", "find_success_patterns", "find_high_risk_projects",
  "find_compliance_chains", "find_equipment_dependencies", "find_workforce_bottlenecks",
]);

async function rpc<T>(db: Db, fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(error.message);
  return (data ?? []) as T;
}

interface NodeRow { id: string; label: string; entity_type: string; attributes?: Record<string, unknown> }

async function nodesOfType(db: Db, agencyId: string, type: string, limit = 500) {
  const { data } = await db
    .from("woic_graph_entities")
    .select("id, label, entity_type, attributes")
    .eq("agency_id", agencyId)
    .eq("entity_type", type)
    .limit(limit);
  return (data ?? []) as NodeRow[];
}

async function resolveNode(db: Db, agencyId: string, p: Params): Promise<string | null> {
  if (isUuid(p.node_id)) return p.node_id as string;
  if (str(p.ref_entity) && isUuid(p.ref_id)) {
    const { data } = await db
      .from("woic_graph_entities")
      .select("id")
      .eq("agency_id", agencyId)
      .eq("ref_entity", str(p.ref_entity))
      .eq("ref_id", p.ref_id as string)
      .maybeSingle();
    return (data?.id as string) ?? null;
  }
  if (str(p.entity_key)) {
    const { data } = await db
      .from("woic_graph_entities")
      .select("id")
      .eq("agency_id", agencyId)
      .eq("entity_key", str(p.entity_key))
      .maybeSingle();
    return (data?.id as string) ?? null;
  }
  return null;
}

/** Edges of a node grouped by relation, used by several composite APIs. */
async function relationsOf(db: Db, agencyId: string, nodeId: string, relation?: string) {
  let q = db
    .from("woic_graph_edges")
    .select("id, from_id, to_id, relation, weight")
    .eq("agency_id", agencyId)
    .or(`from_id.eq.${nodeId},to_id.eq.${nodeId}`)
    .is("valid_to", null)
    .limit(500);
  if (relation) q = q.eq("relation", relation);
  const { data } = await q;
  return data ?? [];
}

async function runOperation(
  db: Db,
  agencyId: string,
  operation: string,
  p: Params,
): Promise<unknown> {
  switch (operation) {
    case "taxonomy": {
      const [nodeTypes, relationTypes] = await Promise.all([
        db.from("woic_graph_node_types").select("*").order("category"),
        db.from("woic_graph_relation_types").select("*").order("category"),
      ]);
      return { node_types: nodeTypes.data ?? [], relation_types: relationTypes.data ?? [] };
    }

    case "sync":
      return await syncAgencyGraph(db, agencyId, Math.min(num(p.limit, 2000), 5000));

    case "subgraph": {
      const args = {
        _agency_id: agencyId,
        _entity_types: strArr(p.entity_types),
        _relations: strArr(p.relations),
        _as_of: str(p.as_of, 40) || null,
        _limit: Math.min(num(p.limit, 400), 2000),
      };
      const { data, cached } = await withGraphCache(db, agencyId, "subgraph", args, 120, () =>
        rpc<Record<string, unknown>>(db, "woic_graph_subgraph", args));
      return { ...(data as Record<string, unknown>), cached };
    }

    case "neighbors": {
      const nodeId = await resolveNode(db, agencyId, p);
      if (!nodeId) return { error: "node_not_found" };
      return {
        node_id: nodeId,
        neighbors: await rpc(db, "woic_graph_neighbors", {
          _agency_id: agencyId,
          _node_id: nodeId,
          _depth: Math.min(num(p.depth, 2), 5),
          _relations: strArr(p.relations),
          _as_of: str(p.as_of, 40) || null,
          _limit: Math.min(num(p.limit, 200), 1000),
        }),
      };
    }

    case "shortest_path": {
      const from = await resolveNode(db, agencyId, { node_id: p.from_id, entity_key: p.from_key });
      const to = await resolveNode(db, agencyId, { node_id: p.to_id, entity_key: p.to_key });
      if (!from || !to) return { error: "node_not_found" };
      const path = await rpc<unknown[]>(db, "woic_graph_shortest_path", {
        _agency_id: agencyId, _from_id: from, _to_id: to, _max_depth: Math.min(num(p.max_depth, 6), 8),
      });
      return { from, to, hops: Math.max(path.length - 1, 0), path, connected: path.length > 0 };
    }

    case "similar": {
      const nodeId = await resolveNode(db, agencyId, p);
      if (!nodeId) return { error: "node_not_found" };
      return {
        node_id: nodeId,
        results: await rpc(db, "woic_graph_similar", {
          _agency_id: agencyId, _node_id: nodeId,
          _entity_type: str(p.entity_type, 60) || null,
          _relations: strArr(p.relations),
          _limit: Math.min(num(p.limit, 20), 100),
        }),
      };
    }

    case "influence":
      return {
        results: await rpc(db, "woic_graph_influence", {
          _agency_id: agencyId,
          _entity_type: str(p.entity_type, 60) || null,
          _limit: Math.min(num(p.limit, 25), 100),
        }),
      };

    case "communities": {
      const args = {
        _agency_id: agencyId,
        _relations: strArr(p.relations),
        _max_depth: Math.min(num(p.max_depth, 3), 4),
        _limit: Math.min(num(p.limit, 15), 50),
      };
      const { data, cached } = await withGraphCache(db, agencyId, "communities", args, 300, () =>
        rpc<unknown[]>(db, "woic_graph_communities", args));
      return { communities: data, cached };
    }

    case "risk_propagation": {
      const nodeId = await resolveNode(db, agencyId, p);
      if (!nodeId) return { error: "node_not_found" };
      return {
        source: nodeId,
        impacted: await rpc(db, "woic_graph_risk_propagation", {
          _agency_id: agencyId, _node_id: nodeId,
          _depth: Math.min(num(p.depth, 3), 5),
          _decay: num(p.decay, 0.55),
        }),
      };
    }

    case "resolve": {
      const nodeId = await resolveNode(db, agencyId, p);
      if (!nodeId) return { node: null };
      const { data } = await db.from("woic_graph_entities").select("*").eq("id", nodeId).maybeSingle();
      return { node: data };
    }

    // ---------------- composite graph APIs ----------------

    case "find_similar_workers": {
      const nodeId = await resolveNode(db, agencyId, p);
      if (!nodeId) return { error: "node_not_found" };
      const results = await rpc<Array<Record<string, unknown>>>(db, "woic_graph_similar", {
        _agency_id: agencyId, _node_id: nodeId, _entity_type: "worker",
        _relations: strArr(p.relations) ?? ["has_skill", "worked_on", "has_certification", "operates"],
        _limit: Math.min(num(p.limit, 20), 100),
      });
      return {
        workers: results.map((r) => ({
          ...r,
          why: `Shares ${r.shared} connections (${((r.shared_labels as string[]) ?? []).slice(0, 4).join(", ")})`,
        })),
      };
    }

    case "find_missing_skills": {
      const workerNode = await resolveNode(db, agencyId, p);
      if (!workerNode) return { error: "node_not_found" };
      const target = str(p.target_entity_type, 40) || "project";
      const mine = new Set(
        (await relationsOf(db, agencyId, workerNode, "has_skill")).map((e) =>
          e.from_id === workerNode ? e.to_id : e.from_id),
      );
      const { data: demanded } = await db
        .from("woic_graph_edges")
        .select("to_id, from_id")
        .eq("agency_id", agencyId)
        .eq("relation", "requires_skill")
        .is("valid_to", null)
        .limit(2000);
      const counts = new Map<string, number>();
      for (const e of demanded ?? []) {
        if (mine.has(e.to_id as string)) continue;
        counts.set(e.to_id as string, (counts.get(e.to_id as string) ?? 0) + 1);
      }
      const ids = [...counts.keys()].slice(0, 200);
      const { data: labels } = await db
        .from("woic_graph_entities").select("id, label, entity_type").in("id", ids.length ? ids : [workerNode]);
      return {
        target,
        gaps: (labels ?? [])
          .map((n) => ({ skill_id: n.id, label: n.label, demand: counts.get(n.id as string) ?? 0 }))
          .sort((a, b) => b.demand - a.demand)
          .slice(0, Math.min(num(p.limit, 15), 50)),
      };
    }

    case "find_hidden_experts": {
      // High skill/equipment connectivity but low recent project connectivity.
      const influence = await rpc<Array<Record<string, unknown>>>(db, "woic_graph_influence", {
        _agency_id: agencyId, _entity_type: "worker", _limit: 200,
      });
      const { data: assignments } = await db
        .from("woic_graph_edges")
        .select("from_id")
        .eq("agency_id", agencyId)
        .eq("relation", "worked_on")
        .is("valid_to", null)
        .limit(4000);
      const worked = new Map<string, number>();
      for (const e of assignments ?? []) worked.set(e.from_id as string, (worked.get(e.from_id as string) ?? 0) + 1);
      return {
        experts: influence
          .map((w) => ({
            ...w,
            assignments: worked.get(w.node_id as string) ?? 0,
            hidden_score: Number(w.score ?? 0) / (1 + (worked.get(w.node_id as string) ?? 0)),
          }))
          .filter((w) => Number(w.degree ?? 0) >= 2)
          .sort((a, b) => b.hidden_score - a.hidden_score)
          .slice(0, Math.min(num(p.limit, 15), 50)),
      };
    }

    case "find_career_paths": {
      const workerNode = await resolveNode(db, agencyId, p);
      if (!workerNode) return { error: "node_not_found" };
      const peers = await rpc<Array<Record<string, unknown>>>(db, "woic_graph_similar", {
        _agency_id: agencyId, _node_id: workerNode, _entity_type: "worker",
        _relations: ["has_skill", "has_certification"], _limit: 25,
      });
      const paths: unknown[] = [];
      for (const peer of peers.slice(0, 8)) {
        const nb = await rpc<Array<Record<string, unknown>>>(db, "woic_graph_neighbors", {
          _agency_id: agencyId, _node_id: peer.node_id, _depth: 1,
          _relations: ["has_skill", "has_certification", "worked_on"], _as_of: null, _limit: 60,
        });
        paths.push({
          peer: { id: peer.node_id, label: peer.label, similarity: peer.similarity },
          next_steps: nb.filter((n) => n.entity_type !== "worker").slice(0, 10),
        });
      }
      return { worker: workerNode, paths };
    }

    case "find_team_dependencies": {
      const nodeId = await resolveNode(db, agencyId, p);
      if (!nodeId) return { error: "node_not_found" };
      const nb = await rpc<Array<Record<string, unknown>>>(db, "woic_graph_neighbors", {
        _agency_id: agencyId, _node_id: nodeId, _depth: 2, _relations: null, _as_of: null, _limit: 300,
      });
      const byType: Record<string, unknown[]> = {};
      for (const n of nb) {
        if (!n.depth) continue;
        (byType[n.entity_type as string] ??= []).push(n);
      }
      return {
        node_id: nodeId,
        dependencies: Object.entries(byType).map(([type, items]) => ({
          entity_type: type,
          count: items.length,
          critical: items.slice(0, 8),
        })),
      };
    }

    case "find_organizational_risks": {
      const [skillInfluence, workerInfluence, equipInfluence] = await Promise.all([
        rpc<Array<Record<string, unknown>>>(db, "woic_graph_influence", { _agency_id: agencyId, _entity_type: "skill", _limit: 40 }),
        rpc<Array<Record<string, unknown>>>(db, "woic_graph_influence", { _agency_id: agencyId, _entity_type: "worker", _limit: 40 }),
        rpc<Array<Record<string, unknown>>>(db, "woic_graph_influence", { _agency_id: agencyId, _entity_type: "equipment", _limit: 40 }),
      ]);
      const singlePoint = (rows: Array<Record<string, unknown>>, kind: string) =>
        rows.filter((r) => Number(r.in_degree ?? 0) <= 1 && Number(r.degree ?? 0) >= 3)
          .map((r) => ({ kind, node_id: r.node_id, label: r.label, degree: r.degree, score: r.score }));
      return {
        risks: [
          ...singlePoint(skillInfluence, "skill_concentration"),
          ...singlePoint(workerInfluence, "key_person"),
          ...singlePoint(equipInfluence, "equipment_dependency"),
        ].slice(0, Math.min(num(p.limit, 25), 60)),
        top_skills: skillInfluence.slice(0, 10),
        top_people: workerInfluence.slice(0, 10),
      };
    }

    case "find_knowledge_clusters": {
      const args = {
        _agency_id: agencyId,
        _relations: strArr(p.relations) ?? ["has_skill", "grants_skill", "requires_skill", "documents"],
        _max_depth: 3,
        _limit: Math.min(num(p.limit, 15), 40),
      };
      const { data } = await withGraphCache(db, agencyId, "knowledge_clusters", args, 300, () =>
        rpc<unknown[]>(db, "woic_graph_communities", args));
      return { clusters: data };
    }

    case "find_success_patterns": {
      const { data: edges } = await db
        .from("woic_graph_edges")
        .select("from_id, to_id, weight, attributes")
        .eq("agency_id", agencyId)
        .eq("relation", "worked_on")
        .is("valid_to", null)
        .limit(4000);
      const signed = (edges ?? []).filter((e) =>
        ["signed", "closed", "approved"].includes(String((e.attributes as Record<string, unknown>)?.status ?? "")));
      const workerWins = new Map<string, number>();
      for (const e of signed) workerWins.set(e.from_id as string, (workerWins.get(e.from_id as string) ?? 0) + 1);
      const topWorkers = [...workerWins.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
      const { data: labels } = await db
        .from("woic_graph_entities").select("id, label")
        .in("id", topWorkers.length ? topWorkers.map(([id]) => id) : [agencyId]);
      const labelOf = new Map((labels ?? []).map((l) => [l.id as string, l.label as string]));
      const patterns: unknown[] = [];
      for (const [id, wins] of topWorkers.slice(0, 6)) {
        const nb = await rpc<Array<Record<string, unknown>>>(db, "woic_graph_neighbors", {
          _agency_id: agencyId, _node_id: id, _depth: 1,
          _relations: ["has_skill", "has_certification", "operates"], _as_of: null, _limit: 40,
        });
        patterns.push({
          node_id: id, label: labelOf.get(id) ?? "Worker", successful_assignments: wins,
          attributes: nb.filter((n) => n.depth).map((n) => ({ type: n.entity_type, label: n.label })).slice(0, 10),
        });
      }
      return { total_successful: signed.length, patterns };
    }

    case "find_high_risk_projects": {
      const projects = await nodesOfType(db, agencyId, "project", 400);
      const influence = await rpc<Array<Record<string, unknown>>>(db, "woic_graph_influence", {
        _agency_id: agencyId, _entity_type: "project", _limit: 200,
      });
      const degreeOf = new Map(influence.map((i) => [i.node_id as string, Number(i.degree ?? 0)]));
      const scored = projects.map((pr) => {
        const attrs = (pr.attributes ?? {}) as Record<string, unknown>;
        const degree = degreeOf.get(pr.id) ?? 0;
        const status = String(attrs.status ?? "");
        let risk = 0;
        if (["rejected", "corrected"].includes(status)) risk += 0.45;
        if (["draft", "sent", "viewed"].includes(status)) risk += 0.2;
        if (degree <= 1) risk += 0.3; // isolated / under-resourced
        if (Number(attrs.hours ?? 0) > 12) risk += 0.15;
        return { node_id: pr.id, label: pr.label, status, degree, risk: Math.min(Math.round(risk * 100) / 100, 1) };
      });
      return {
        projects: scored.filter((s) => s.risk > 0).sort((a, b) => b.risk - a.risk)
          .slice(0, Math.min(num(p.limit, 25), 100)),
      };
    }

    case "find_compliance_chains": {
      const nodeId = await resolveNode(db, agencyId, p);
      const relations = ["has_certification", "requires_training", "grants_skill", "changed_compliance", "requires_inspection"];
      if (nodeId) {
        return {
          node_id: nodeId,
          chain: await rpc(db, "woic_graph_neighbors", {
            _agency_id: agencyId, _node_id: nodeId, _depth: 3, _relations: relations, _as_of: null, _limit: 200,
          }),
        };
      }
      const certs = await nodesOfType(db, agencyId, "certification", 60);
      const chains: unknown[] = [];
      for (const c of certs.slice(0, 12)) {
        chains.push({
          certification: { id: c.id, label: c.label },
          holders: (await relationsOf(db, agencyId, c.id, "has_certification")).length,
          downstream: await rpc(db, "woic_graph_neighbors", {
            _agency_id: agencyId, _node_id: c.id, _depth: 2, _relations: relations, _as_of: null, _limit: 40,
          }),
        });
      }
      return { chains };
    }

    case "find_equipment_dependencies": {
      const influence = await rpc<Array<Record<string, unknown>>>(db, "woic_graph_influence", {
        _agency_id: agencyId, _entity_type: "equipment", _limit: Math.min(num(p.limit, 25), 100),
      });
      const rows: unknown[] = [];
      for (const eq of influence.slice(0, 12)) {
        const nb = await rpc<Array<Record<string, unknown>>>(db, "woic_graph_neighbors", {
          _agency_id: agencyId, _node_id: eq.node_id, _depth: 1,
          _relations: ["operates", "uses", "owns", "located_at"], _as_of: null, _limit: 100,
        });
        const operators = nb.filter((n) => n.entity_type === "worker").length;
        rows.push({
          ...eq,
          operators,
          projects: nb.filter((n) => n.entity_type === "project").length,
          single_operator_risk: operators <= 1,
        });
      }
      return { equipment: rows };
    }

    case "find_workforce_bottlenecks": {
      const skills = await rpc<Array<Record<string, unknown>>>(db, "woic_graph_influence", {
        _agency_id: agencyId, _entity_type: "skill", _limit: 100,
      });
      const bottlenecks: unknown[] = [];
      for (const s of skills.slice(0, 25)) {
        const edges = await relationsOf(db, agencyId, s.node_id as string);
        const supply = edges.filter((e) => e.relation === "has_skill").length;
        const demand = edges.filter((e) => e.relation === "requires_skill").length;
        if (!demand && !supply) continue;
        bottlenecks.push({
          node_id: s.node_id, label: s.label, supply, demand,
          ratio: supply ? Math.round((demand / supply) * 100) / 100 : demand,
          severity: supply === 0 && demand > 0 ? "critical" : demand > supply ? "high" : "ok",
        });
      }
      return {
        bottlenecks: (bottlenecks as Array<{ ratio: number }>).sort((a, b) => b.ratio - a.ratio)
          .slice(0, Math.min(num(p.limit, 20), 60)),
      };
    }

    default:
      return { error: "unsupported_operation" };
  }
}

Deno.serve(withSentry("woic-graph", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);

  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;
  const { user, userClient } = auth;

  const raw = await req.text();
  if (raw.length > 256_000) {
    return jsonResponse({ error: "Payload too large.", code: "payload_too_large" }, 413, corsHeaders);
  }
  let body: { agency_id?: string; operation?: string; params?: Params } | null = null;
  try {
    body = JSON.parse(raw);
  } catch {
    return jsonResponse({ error: "Invalid JSON body.", code: "bad_request" }, 400, corsHeaders);
  }

  const agencyId = body?.agency_id;
  const operation = str(body?.operation, 64);
  const params = (body?.params ?? {}) as Params;

  if (!isUuid(agencyId)) {
    return jsonResponse({ error: "A valid agency_id is required.", code: "bad_request" }, 400, corsHeaders);
  }
  if (!PRIMITIVES.has(operation) && !APIS.has(operation)) {
    return jsonResponse({ error: "Unsupported graph operation.", code: "bad_request" }, 400, corsHeaders);
  }

  const forbidden = await requireAgencyMember(userClient, agencyId, corsHeaders);
  if (forbidden) return forbidden;

  const started = Date.now();
  try {
    const data = await runOperation(admin(), agencyId, operation, params);
    await logCognitiveRequest({
      agency_id: agencyId, user_id: user.id, service: "graph", operation,
      input: params, output: null, latency_ms: Date.now() - started, model: null,
    });
    return jsonResponse({ data }, 200, corsHeaders);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Graph query failed.";
    await logCognitiveRequest({
      agency_id: agencyId, user_id: user.id, service: "graph", operation,
      input: params, status: "error", error: message, latency_ms: Date.now() - started, model: null,
    });
    return jsonResponse({ error: "Graph query failed.", code: "graph_error" }, 500, corsHeaders);
  }
}));
