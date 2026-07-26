// pb-generate-payroll: turn approved TTO tickets into a payroll run + items.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withSentry } from "../_shared/sentry.ts";
import { requireUser, jsonResponse } from "../_shared/auth.ts";

type Rate = { rate_type: string; amount: number };

Deno.serve(withSentry("pb-generate-payroll", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON", code: "bad_request" }, 400, corsHeaders); }
  const agency_id = String(body.agency_id ?? "");
  const period_start = String(body.period_start ?? "");
  const period_end = String(body.period_end ?? "");
  const source_batch_id = body.source_batch_id ? String(body.source_batch_id) : null;
  const name = String(body.name ?? `Payroll ${period_start}–${period_end}`);
  if (!agency_id || !period_start || !period_end)
    return jsonResponse({ error: "agency_id, period_start, period_end required", code: "bad_request" }, 400, corsHeaders);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: tickets, error: tErr } = await admin.from("tto_time_tickets")
    .select("*").eq("agency_id", agency_id)
    .in("status", ["approved", "payroll_ready"])
    .gte("work_date", period_start).lte("work_date", period_end);
  if (tErr) return jsonResponse({ error: tErr.message, code: "db_error" }, 500, corsHeaders);

  const { data: rates } = await admin.from("pb_worker_pay_rates")
    .select("worker_id, rate_type, amount").eq("agency_id", agency_id);
  const rateMap = new Map<string, Map<string, number>>();
  for (const r of (rates ?? []) as Rate[] & { worker_id: string }[]) {
    if (!rateMap.has(r.worker_id)) rateMap.set(r.worker_id, new Map());
    rateMap.get(r.worker_id)!.set(r.rate_type, Number(r.amount) || 0);
  }
  const getRate = (wid: string, kind: string, def = 0) => rateMap.get(wid)?.get(kind) ?? def;

  const { data: run, error: runErr } = await admin.from("pb_payroll_runs").insert({
    agency_id, name, period_start, period_end, source_batch_id,
    status: "draft", created_by: auth.user.id, totals: {},
  }).select().single();
  if (runErr || !run) return jsonResponse({ error: runErr?.message ?? "run_insert_failed", code: "db_error" }, 500, corsHeaders);

  let totalGross = 0, totalNet = 0, totalReg = 0, totalOt = 0, totalDt = 0;
  const exceptions: Array<{ category: string; severity: string; message: string; item_id?: string }> = [];

  for (const t of tickets ?? []) {
    const reg = Number(t.regular_hours ?? 0);
    const ot = Number(t.overtime_hours ?? 0);
    const dt = Number(t.double_time_hours ?? 0);
    const regRate = getRate(t.worker_id, "regular");
    const otRate = getRate(t.worker_id, "overtime", regRate * 1.5);
    const dtRate = getRate(t.worker_id, "double_time", regRate * 2);
    const gross = reg * regRate + ot * otRate + dt * dtRate;
    // stub tax rules: 15% federal + state placeholder
    const taxes = +(gross * 0.15).toFixed(2);
    const deductions = 0;
    const net = +(gross - taxes - deductions).toFixed(2);

    const { data: item } = await admin.from("pb_payroll_items").insert({
      run_id: run.id, agency_id, worker_id: t.worker_id, ticket_id: t.id,
      regular_hours: reg, ot_hours: ot, dt_hours: dt,
      gross_pay: +gross.toFixed(2), taxes, deductions, net_pay: net,
      meta: { rates: { regular: regRate, overtime: otRate, double_time: dtRate } },
    }).select().single();

    if (regRate === 0 && reg > 0)
      exceptions.push({ category: "missing_rate", severity: "error", message: `Worker ${t.worker_id} missing regular rate`, item_id: item?.id });
    if (reg + ot + dt === 0)
      exceptions.push({ category: "missing_hours", severity: "warning", message: `Ticket ${t.id} has zero hours`, item_id: item?.id });

    totalReg += reg; totalOt += ot; totalDt += dt;
    totalGross += gross; totalNet += net;
  }

  if (exceptions.length) {
    await admin.from("pb_payroll_exceptions").insert(
      exceptions.map((e) => ({ run_id: run.id, agency_id, ...e })),
    );
  }

  const totals = {
    ticket_count: tickets?.length ?? 0,
    regular_hours: totalReg, overtime_hours: totalOt, double_time_hours: totalDt,
    gross_pay: +totalGross.toFixed(2), net_pay: +totalNet.toFixed(2),
    exceptions: exceptions.length,
  };
  await admin.from("pb_payroll_runs").update({
    totals, status: exceptions.some((e) => e.severity === "error") ? "exception" : "review",
  }).eq("id", run.id);

  // TTOS event (best-effort)
  await admin.from("ttos_events").insert({
    agency_id, event_type: "payroll.run.created", subject_type: "pb_payroll_run",
    subject_id: run.id, payload: totals, actor_id: auth.user.id,
  }).then(() => null, () => null);

  return jsonResponse({ ok: true, run_id: run.id, totals, exceptions: exceptions.length }, 200, corsHeaders);
}));
