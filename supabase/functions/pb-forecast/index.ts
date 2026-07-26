// pb-forecast: compute simple financial forecast + margin snapshots.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withSentry } from "../_shared/sentry.ts";
import { requireUser, jsonResponse } from "../_shared/auth.ts";

Deno.serve(withSentry("pb-forecast", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON", code: "bad_request" }, 400, corsHeaders); }
  const agency_id = String(body.agency_id ?? "");
  if (!agency_id) return jsonResponse({ error: "agency_id required", code: "bad_request" }, 400, corsHeaders);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const today = new Date();
  const start = new Date(today); start.setDate(start.getDate() - 90);
  const horizonEnd = new Date(today); horizonEnd.setDate(horizonEnd.getDate() + 30);

  const [{ data: runs }, { data: invs }] = await Promise.all([
    admin.from("pb_payroll_runs").select("totals, period_end").eq("agency_id", agency_id).gte("period_end", start.toISOString().slice(0, 10)),
    admin.from("pb_invoices").select("total, period_end, status").eq("agency_id", agency_id).gte("period_end", start.toISOString().slice(0, 10)),
  ]);

  const totalCost = (runs ?? []).reduce((s, r) => s + Number((r.totals as Record<string, unknown>)?.gross_pay ?? 0), 0);
  const totalRev = (invs ?? []).reduce((s, i) => s + Number(i.total ?? 0), 0);
  const outstanding = (invs ?? []).filter((i) => i.status !== "paid").reduce((s, i) => s + Number(i.total ?? 0), 0);
  const avgWeekCost = totalCost / 13;
  const avgWeekRev = totalRev / 13;

  const metrics = [
    { metric: "payroll_cost", value_json: { projected_next_30: +(avgWeekCost * 4.3).toFixed(2), history_90: +totalCost.toFixed(2) } },
    { metric: "revenue", value_json: { projected_next_30: +(avgWeekRev * 4.3).toFixed(2), history_90: +totalRev.toFixed(2) } },
    { metric: "cash_flow", value_json: { projected_next_30: +((avgWeekRev - avgWeekCost) * 4.3).toFixed(2) } },
    { metric: "ar", value_json: { outstanding: +outstanding.toFixed(2) } },
    { metric: "profit", value_json: { gross_history_90: +(totalRev - totalCost).toFixed(2) } },
  ];
  for (const m of metrics) {
    await admin.from("pb_financial_forecasts").insert({
      agency_id, horizon_start: today.toISOString().slice(0, 10),
      horizon_end: horizonEnd.toISOString().slice(0, 10), ...m,
    });
  }

  await admin.from("pb_margin_analysis").insert({
    agency_id, scope: "agency", scope_id: null,
    period_start: start.toISOString().slice(0, 10), period_end: today.toISOString().slice(0, 10),
    revenue: +totalRev.toFixed(2), cost: +totalCost.toFixed(2),
    gross_margin: +(totalRev - totalCost).toFixed(2),
    net_margin: +(totalRev - totalCost).toFixed(2),
  });

  await admin.from("ttos_events").insert({
    agency_id, event_type: "forecast.updated", subject_type: "agency",
    subject_id: agency_id, payload: { metrics: metrics.length }, actor_id: auth.user.id,
  }).then(() => null, () => null);

  return jsonResponse({ ok: true, metrics: metrics.length }, 200, corsHeaders);
}));
