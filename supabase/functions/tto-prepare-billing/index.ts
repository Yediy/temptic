// tto-prepare-billing: compute billable hours + invoice lines for a client period.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withSentry } from "../_shared/sentry.ts";
import { requireUser, jsonResponse } from "../_shared/auth.ts";

Deno.serve(withSentry("tto-prepare-billing", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON", code: "bad_request" }, 400, corsHeaders); }
  const agency_id = String(body.agency_id ?? "");
  const client_id = body.client_id ? String(body.client_id) : null;
  const period_start = String(body.period_start ?? "");
  const period_end = String(body.period_end ?? "");
  const name = String(body.name ?? `Billing ${period_start}–${period_end}`);
  if (!agency_id || !period_start || !period_end)
    return jsonResponse({ error: "agency_id, period_start, period_end required", code: "bad_request" }, 400, corsHeaders);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const q = admin.from("tto_time_tickets").select("*").eq("agency_id", agency_id)
    .in("status", ["approved", "payroll_ready"])
    .gte("work_date", period_start).lte("work_date", period_end);
  if (client_id) q.eq("client_id", client_id);
  const { data: tickets } = await q;

  const ticket_ids: string[] = [];
  let totalHours = 0, totalAmount = 0;
  for (const t of tickets ?? []) {
    ticket_ids.push(t.id);
    const hours = Number(t.regular_hours ?? 0) + Number(t.overtime_hours ?? 0) + Number(t.double_time_hours ?? 0);
    const rate = 0;
    await admin.from("tto_billable_hours").insert({
      agency_id, time_ticket_id: t.id, client_id: t.client_id,
      line_kind: "hours", hours, bill_rate: rate, amount: hours * rate,
    });
    totalHours += hours;
    totalAmount += hours * rate;
    await admin.from("tto_time_tickets").update({ status: "billing_ready" }).eq("id", t.id);
  }

  const { data: batch } = await admin.from("tto_billing_batches").insert({
    agency_id, client_id, name, period_start, period_end,
    status: "prepared", ticket_ids,
    totals: { hours: totalHours, amount: totalAmount, ticket_count: ticket_ids.length },
    created_by: auth.user.id,
  }).select().single();

  return jsonResponse({ ok: true, batch }, 200, corsHeaders);
}));
