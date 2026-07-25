// tto-live-labor: real-time snapshot for the Live Labor Dashboard.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withSentry } from "../_shared/sentry.ts";
import { requireUser, jsonResponse } from "../_shared/auth.ts";

Deno.serve(withSentry("tto-live-labor", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  const url = new URL(req.url);
  const agency_id = url.searchParams.get("agency_id");
  if (!agency_id) return jsonResponse({ error: "agency_id required", code: "bad_request" }, 400, corsHeaders);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const today = new Date().toISOString().slice(0, 10);
  const { data: today_tickets } = await admin.from("tto_time_tickets")
    .select("id,worker_id,status,regular_hours,overtime_hours,double_time_hours,actual_start,actual_end,scheduled_start")
    .eq("agency_id", agency_id).eq("work_date", today);

  const active = (today_tickets ?? []).filter((t) => t.actual_start && !t.actual_end);
  const submitted = (today_tickets ?? []).filter((t) => t.status === "submitted");
  const totalHours = (today_tickets ?? []).reduce((s, t) =>
    s + Number(t.regular_hours ?? 0) + Number(t.overtime_hours ?? 0) + Number(t.double_time_hours ?? 0), 0);
  const otHours = (today_tickets ?? []).reduce((s, t) =>
    s + Number(t.overtime_hours ?? 0) + Number(t.double_time_hours ?? 0), 0);
  const late = (today_tickets ?? []).filter((t) => t.scheduled_start && t.actual_start &&
    new Date(t.actual_start).getTime() - new Date(t.scheduled_start).getTime() > 15 * 60_000).length;

  return jsonResponse({
    ok: true,
    active_workers: active.length,
    total_hours_today: totalHours,
    overtime_hours: otHours,
    late_arrivals: late,
    approval_queue: submitted.length,
  }, 200, corsHeaders);
}));
