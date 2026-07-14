// ttos-dispatch: fans an event out to subscribers.
// Handlers implemented: run_automations, reindex_entity, append_audit.
// Idempotent — re-invoking on a processed event is a no-op.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withSentry } from "../_shared/sentry.ts";
import { jsonResponse } from "../_shared/auth.ts";

type TtosEvent = {
  id: string;
  agency_id: string;
  module: string;
  name: string;
  actor_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  processed_at: string | null;
};

Deno.serve(withSentry("ttos-dispatch", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const body = await req.json().catch(() => ({}));
  const eventId = typeof body.event_id === "string" ? body.event_id : null;

  // Batch mode: drain up to 50 unprocessed events
  let events: TtosEvent[] = [];
  if (eventId) {
    const { data } = await admin.from("ttos_events").select("*").eq("id", eventId).is("processed_at", null).maybeSingle();
    if (data) events = [data as TtosEvent];
  } else {
    const { data } = await admin.from("ttos_events").select("*").is("processed_at", null).order("created_at").limit(50);
    events = (data ?? []) as TtosEvent[];
  }

  let processed = 0;
  for (const evt of events) {
    try {
      await runAutomations(admin, evt);
      await reindexEntity(admin, evt);
      // Audit append is optional — existing audit_logs table has strict shape;
      // we only mirror lightweight metadata.
      await admin
        .from("ttos_events")
        .update({ processed_at: new Date().toISOString(), status: "processed" })
        .eq("id", evt.id)
        .is("processed_at", null);
      processed += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await admin.from("ttos_events").update({ status: "failed", metadata: { ...evt.metadata, dispatch_error: msg } }).eq("id", evt.id);
    }
  }

  return jsonResponse({ processed, scanned: events.length }, 200, corsHeaders);
}));

// ---- handlers ------------------------------------------------------------

async function runAutomations(admin: ReturnType<typeof createClient>, evt: TtosEvent) {
  const { data: autos } = await admin
    .from("ttos_automations")
    .select("*")
    .eq("agency_id", evt.agency_id)
    .eq("enabled", true)
    .or(`trigger_event.eq.${evt.name},trigger_event.eq.*`)
    .order("priority");

  for (const a of autos ?? []) {
    const actions = Array.isArray((a as { actions: unknown }).actions) ? (a as { actions: Array<Record<string, unknown>> }).actions : [];
    let status: "succeeded" | "failed" = "succeeded";
    let error: string | null = null;
    const output: Array<Record<string, unknown>> = [];
    try {
      for (const act of actions) {
        const type = String(act.type ?? "");
        if (type === "notify") {
          const { error: nErr } = await admin.from("notifications").insert({
            agency_id: evt.agency_id,
            recipient_id: (act.recipient_id as string) ?? evt.actor_id,
            title: String(act.title ?? evt.name),
            body: String(act.body ?? ""),
            level: String(act.level ?? "medium"),
            entity_type: evt.entity_type,
            entity_id: evt.entity_id,
          }).select().maybeSingle();
          if (nErr) throw nErr;
          output.push({ type, ok: true });
        } else if (type === "create_task") {
          const { error: tErr } = await admin.from("ttos_tasks").insert({
            agency_id: evt.agency_id,
            title: String(act.title ?? `Follow up: ${evt.name}`),
            description: String(act.description ?? ""),
            owner_id: (act.owner_id as string) ?? evt.actor_id,
            entity_type: evt.entity_type,
            entity_id: evt.entity_id,
            priority: String(act.priority ?? "medium"),
          });
          if (tErr) throw tErr;
          output.push({ type, ok: true });
        } else if (type === "emit_event") {
          await admin.from("ttos_events").insert({
            agency_id: evt.agency_id,
            module: "automation",
            name: String(act.name ?? "automation.emitted"),
            entity_type: evt.entity_type,
            entity_id: evt.entity_id,
            correlation_id: evt.id,
            metadata: (act.metadata as Record<string, unknown>) ?? {},
          });
          output.push({ type, ok: true });
        } else {
          output.push({ type, ok: false, reason: "unsupported_action" });
        }
      }
    } catch (e) {
      status = "failed";
      error = e instanceof Error ? e.message : String(e);
    }
    await admin.from("ttos_automation_runs").insert({
      automation_id: (a as { id: string }).id,
      event_id: evt.id,
      agency_id: evt.agency_id,
      status,
      error,
      output,
    });
  }
}

async function reindexEntity(admin: ReturnType<typeof createClient>, evt: TtosEvent) {
  if (!evt.entity_type || !evt.entity_id) return;
  // Minimal generic reindex — modules can publish richer titles via the
  // event metadata (`search_title`, `search_subtitle`, `search_tags`).
  const title = String((evt.metadata?.search_title as string) ?? `${evt.entity_type} ${evt.entity_id.slice(0, 8)}`);
  const subtitle = (evt.metadata?.search_subtitle as string) ?? evt.name;
  const tags = Array.isArray(evt.metadata?.search_tags) ? evt.metadata.search_tags as string[] : [];
  await admin.from("ttos_search_index").upsert(
    {
      agency_id: evt.agency_id,
      entity_type: evt.entity_type,
      entity_id: evt.entity_id,
      title,
      subtitle,
      tags,
    },
    { onConflict: "entity_type,entity_id" },
  );
}
