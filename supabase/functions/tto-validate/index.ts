// tto-validate: run WOIC-backed anomaly detection over a ticket or agency batch.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withSentry } from "../_shared/sentry.ts";
import { requireUser, jsonResponse } from "../_shared/auth.ts";

Deno.serve(withSentry("tto-validate", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* optional */ }
  const time_ticket_id = body.time_ticket_id ? String(body.time_ticket_id) : null;

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const q = admin.from("tto_time_tickets").select("*").in("status", ["submitted", "in_progress"]);
  if (time_ticket_id) q.eq("id", time_ticket_id);
  const { data: tickets } = await q.limit(200);

  const results: Array<{ id: string; anomalies: string[] }> = [];
  for (const t of tickets ?? []) {
    const anomalies: string[] = [];
    const { data: punches } = await admin.from("tto_time_entries")
      .select("kind,occurred_at").eq("time_ticket_id", t.id).order("occurred_at");
    const ins = (punches ?? []).filter((p) => p.kind === "clock_in").length;
    const outs = (punches ?? []).filter((p) => p.kind === "clock_out").length;
    if (ins !== outs) anomalies.push("missing_punches");
    if ((t.overtime_hours ?? 0) + (t.double_time_hours ?? 0) > 0) anomalies.push("overtime_flagged");
    if ((t.regular_hours ?? 0) + (t.overtime_hours ?? 0) + (t.double_time_hours ?? 0) > 16) anomalies.push("excessive_hours");
    if (t.scheduled_start && t.actual_start &&
        new Date(t.actual_start).getTime() - new Date(t.scheduled_start).getTime() > 15 * 60_000) {
      anomalies.push("late_arrival");
    }
    await admin.from("tto_time_tickets").update({ anomalies }).eq("id", t.id);
    results.push({ id: t.id, anomalies });
  }

  return jsonResponse({ ok: true, scanned: results.length, results }, 200, corsHeaders);
}));
