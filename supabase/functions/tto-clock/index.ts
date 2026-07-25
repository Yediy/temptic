// tto-clock: worker/supervisor punch (clock in/out, break start/end).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withSentry } from "../_shared/sentry.ts";
import { requireUser, jsonResponse } from "../_shared/auth.ts";

Deno.serve(withSentry("tto-clock", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON", code: "bad_request" }, 400, corsHeaders); }

  const time_ticket_id = String(body.time_ticket_id ?? "");
  const kind = String(body.kind ?? "");
  const source = String(body.source ?? "mobile");
  if (!time_ticket_id || !["clock_in", "clock_out", "break_start", "break_end"].includes(kind)) {
    return jsonResponse({ error: "time_ticket_id + valid kind required", code: "bad_request" }, 400, corsHeaders);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: ticket, error: tErr } = await admin
    .from("tto_time_tickets").select("*").eq("id", time_ticket_id).maybeSingle();
  if (tErr || !ticket) return jsonResponse({ error: "Ticket not found", code: "not_found" }, 404, corsHeaders);

  const now = new Date().toISOString();
  const { error: pErr } = await admin.from("tto_time_entries").insert({
    agency_id: ticket.agency_id,
    time_ticket_id,
    worker_id: ticket.worker_id,
    kind,
    source,
    occurred_at: now,
    latitude: body.latitude ?? null,
    longitude: body.longitude ?? null,
    accuracy_m: body.accuracy_m ?? null,
    device_id: body.device_id ?? null,
    metadata: body.metadata ?? {},
  });
  if (pErr) return jsonResponse({ error: pErr.message, code: "internal" }, 500, corsHeaders);

  const patch: Record<string, unknown> = {};
  if (kind === "clock_in" && !ticket.actual_start) { patch.actual_start = now; patch.status = "in_progress"; }
  if (kind === "clock_out") { patch.actual_end = now; }
  if (Object.keys(patch).length) {
    await admin.from("tto_time_tickets").update(patch).eq("id", time_ticket_id);
  }

  await admin.from("tto_audit_events").insert({
    agency_id: ticket.agency_id, time_ticket_id, actor_id: auth.user.id, actor_kind: "worker",
    action: `punch.${kind}`, updated_value: { source, at: now },
  });

  await admin.from("ttos_events").insert({
    agency_id: ticket.agency_id, module: "time_ticket", name: `time.${kind}`,
    actor_id: auth.user.id, entity_type: "tto_time_ticket", entity_id: time_ticket_id,
    metadata: { source },
  });

  return jsonResponse({ ok: true, at: now }, 200, corsHeaders);
}));
