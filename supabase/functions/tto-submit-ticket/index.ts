// tto-submit-ticket: worker submits a time ticket for supervisor approval.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withSentry } from "../_shared/sentry.ts";
import { requireUser, jsonResponse } from "../_shared/auth.ts";

Deno.serve(withSentry("tto-submit-ticket", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON", code: "bad_request" }, 400, corsHeaders); }
  const time_ticket_id = String(body.time_ticket_id ?? "");
  if (!time_ticket_id) return jsonResponse({ error: "time_ticket_id required", code: "bad_request" }, 400, corsHeaders);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: ticket } = await admin.from("tto_time_tickets").select("*").eq("id", time_ticket_id).maybeSingle();
  if (!ticket) return jsonResponse({ error: "Not found", code: "not_found" }, 404, corsHeaders);

  // Compute totals from punches
  const { data: punches } = await admin.from("tto_time_entries")
    .select("kind,occurred_at").eq("time_ticket_id", time_ticket_id).order("occurred_at");
  let workedMs = 0; let inAt: number | null = null;
  for (const p of punches ?? []) {
    if (p.kind === "clock_in") inAt = new Date(p.occurred_at).getTime();
    if (p.kind === "clock_out" && inAt !== null) { workedMs += new Date(p.occurred_at).getTime() - inAt; inAt = null; }
  }
  const totalHours = Math.max(0, workedMs / 3_600_000);
  const regular = Math.min(totalHours, 8);
  const overtime = Math.max(0, Math.min(totalHours - 8, 4));
  const doubleTime = Math.max(0, totalHours - 12);

  const anomalies: string[] = [];
  if ((punches ?? []).length === 0) anomalies.push("no_punches");
  if (inAt !== null) anomalies.push("missing_clock_out");
  if (totalHours > 16) anomalies.push("excessive_hours");

  await admin.from("tto_time_tickets").update({
    status: "submitted",
    submitted_at: new Date().toISOString(),
    regular_hours: regular,
    overtime_hours: overtime,
    double_time_hours: doubleTime,
    anomalies,
    worker_notes: body.notes ?? ticket.worker_notes,
  }).eq("id", time_ticket_id);

  await admin.from("tto_audit_events").insert({
    agency_id: ticket.agency_id, time_ticket_id, actor_id: auth.user.id, actor_kind: "worker",
    action: "ticket.submitted", updated_value: { regular, overtime, doubleTime, anomalies },
  });

  await admin.from("ttos_events").insert({
    agency_id: ticket.agency_id, module: "time_ticket", name: "time.ticket.submitted",
    actor_id: auth.user.id, entity_type: "tto_time_ticket", entity_id: time_ticket_id,
    metadata: { anomalies, total_hours: totalHours },
  });

  return jsonResponse({ ok: true, totals: { regular, overtime, doubleTime }, anomalies }, 200, corsHeaders);
}));
