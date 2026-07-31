// woic-ingest-events — the WOIC event-bus subscriber.
//
// Drains unprocessed platform events (ttos_events) into the cognitive core:
//   - converts operationally significant events into semantic memory
//   - keeps the knowledge graph's entities and relationships current
//   - refreshes organizational memory counters used by the learning engine
//
// Designed to be invoked continuously (cron / queue worker). Idempotent per
// event via woic_org_memory watermarks, and safe to run concurrently across
// agencies because all work is agency-scoped.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { withSentry } from "../_shared/sentry.ts";
import { jsonResponse, requireUser } from "../_shared/auth.ts";
import { admin, isUuid, requireAgencyMember } from "../_shared/woic.ts";
import { storeMemory, upsertGraphEdge, upsertGraphEntity } from "../_shared/woic-cognitive.ts";

const MEMORABLE = new Set([
  "ticket.signed", "ticket.rejected", "ticket.corrected",
  "job.created", "job.closed", "placement.created", "assignment.completed",
  "compliance.violation", "credential.expiring", "incident.reported",
  "payroll.approved", "invoice.paid", "client.escalation",
]);

Deno.serve(withSentry("woic-ingest-events", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);

  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  const body = await req.json().catch(() => ({})) as { agency_id?: string; limit?: number };
  if (!isUuid(body.agency_id)) {
    return jsonResponse({ error: "agency_id must be a uuid", code: "bad_request" }, 400, corsHeaders);
  }
  const forbidden = await requireAgencyMember(auth.userClient, body.agency_id, corsHeaders);
  if (forbidden) return forbidden;

  const agencyId = body.agency_id;
  const limit = Math.min(Math.max(Number(body.limit ?? 100) | 0, 1), 500);
  const db = admin();

  // Watermark so each event is ingested at most once.
  const { data: watermarkRow } = await db
    .from("woic_org_memory")
    .select("id, value")
    .eq("agency_id", agencyId).eq("kind", "system").eq("key", "event_ingest_watermark")
    .maybeSingle();
  const since = (watermarkRow?.value as { last_at?: string } | null)?.last_at ??
    new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  const { data: events, error } = await db
    .from("ttos_events")
    .select("id, event_type, entity_type, entity_id, actor_id, payload, created_at")
    .eq("agency_id", agencyId)
    .gt("created_at", since)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) return jsonResponse({ error: error.message, code: "internal" }, 500, corsHeaders);

  let memories = 0;
  let graphNodes = 0;
  let last = since;

  for (const ev of events ?? []) {
    last = ev.created_at;

    // Knowledge graph: event -> entity relationship.
    if (ev.entity_type && ev.entity_id) {
      const entityId = await upsertGraphEntity(db, agencyId, {
        entity_type: String(ev.entity_type).slice(0, 40),
        entity_key: String(ev.entity_id).toLowerCase(),
        label: `${ev.entity_type} ${String(ev.entity_id).slice(0, 8)}`,
        ref_entity: String(ev.entity_type),
        ref_id: isUuid(ev.entity_id) ? ev.entity_id : null,
      });
      const actionId = await upsertGraphEntity(db, agencyId, {
        entity_type: "event_type",
        entity_key: String(ev.event_type).toLowerCase(),
        label: String(ev.event_type),
      });
      if (entityId && actionId) {
        graphNodes += 2;
        await upsertGraphEdge(db, agencyId, actionId, entityId, "affects", { last_seen: ev.created_at });
      }
      if (ev.actor_id && entityId) {
        const actorId = await upsertGraphEntity(db, agencyId, {
          entity_type: "actor",
          entity_key: String(ev.actor_id).toLowerCase(),
          label: `actor ${String(ev.actor_id).slice(0, 8)}`,
          ref_entity: "user",
          ref_id: isUuid(ev.actor_id) ? ev.actor_id : null,
        });
        if (actorId) await upsertGraphEdge(db, agencyId, actorId, entityId, "acted_on");
      }
    }

    // Semantic memory for operationally significant events only.
    if (MEMORABLE.has(String(ev.event_type))) {
      try {
        await storeMemory(db, {
          agency_id: agencyId,
          scope: "operational",
          kind: "event",
          title: String(ev.event_type),
          content: `Event ${ev.event_type} on ${ev.entity_type ?? "platform"} ${ev.entity_id ?? ""} at ${ev.created_at}. Payload: ${JSON.stringify(ev.payload ?? {}).slice(0, 2000)}`,
          source_entity: ev.entity_type ?? "ttos_event",
          source_id: isUuid(ev.entity_id) ? ev.entity_id : null,
          importance: String(ev.event_type).includes("violation") || String(ev.event_type).includes("incident") ? 0.9 : 0.6,
          metadata: { event_id: ev.id, actor_id: ev.actor_id ?? null },
        });
        memories++;
      } catch { /* one bad event must not stall ingestion */ }
    }
  }

  await db.from("woic_org_memory").upsert({
    id: watermarkRow?.id,
    agency_id: agencyId,
    kind: "system",
    key: "event_ingest_watermark",
    value: { last_at: last, ingested: (events ?? []).length },
    weight: 1,
    updated_at: new Date().toISOString(),
  }, { onConflict: "agency_id,kind,key" });

  return jsonResponse(
    { data: { processed: (events ?? []).length, memories, graph_nodes: graphNodes, watermark: last } },
    200,
    corsHeaders,
  );
}));
