// tto-prepare-payroll: compute labor cost lines for an approved ticket set.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withSentry } from "../_shared/sentry.ts";
import { requireUser, jsonResponse } from "../_shared/auth.ts";
import { hasAgencyRole, TTO_PAYROLL } from "../_shared/tto_access.ts";
import { agreedRate, type ContractTerms } from "../_shared/contract-rates.ts";

Deno.serve(withSentry("tto-prepare-payroll", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON", code: "bad_request" }, 400, corsHeaders); }
  const agency_id = String(body.agency_id ?? "");
  const period_start = String(body.period_start ?? "");
  const period_end = String(body.period_end ?? "");
  const name = String(body.name ?? `Payroll ${period_start}–${period_end}`);
  if (!agency_id || !period_start || !period_end)
    return jsonResponse({ error: "agency_id, period_start, period_end required", code: "bad_request" }, 400, corsHeaders);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  if (!(await hasAgencyRole(admin, auth.user.id, agency_id, TTO_PAYROLL))) return jsonResponse({ error: "Forbidden", code: "forbidden" }, 403, corsHeaders);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(period_start) || !/^\d{4}-\d{2}-\d{2}$/.test(period_end)) return jsonResponse({ error: "Invalid period", code: "bad_request" }, 400, corsHeaders);
  if (period_end < period_start) return jsonResponse({ error: "Period end must follow period start" }, 400, corsHeaders);
  const { data: tickets, error: ticketError } = await admin.from("tto_time_tickets")
    .select("*").eq("agency_id", agency_id).eq("status", "approved")
    .gte("work_date", period_start).lte("work_date", period_end);
  if (ticketError) return jsonResponse({ error: ticketError.message }, 500, corsHeaders);
  if (!tickets?.length) return jsonResponse({ error: "No newly approved tickets in this period" }, 409, corsHeaders);
  const { data: terms, error: termsError } = await admin.from("tto_ticket_terms").select("*").eq("agency_id", agency_id).in("time_ticket_id", tickets.map(t => t.id));
  if (termsError) return jsonResponse({ error: termsError.message }, 500, corsHeaders);
  const termMap = new Map<string, ContractTerms>((terms ?? []).map(t => [t.time_ticket_id, t as ContractTerms]));
  try { for (const t of tickets) agreedRate(termMap.get(t.id), "payroll"); }
  catch (e) { return jsonResponse({ error: e instanceof Error ? e.message : "Agreed contract pay is missing" }, 409, corsHeaders); }
  const currencies = new Set(tickets.map(t => agreedRate(termMap.get(t.id), "payroll").currency));
  if (currencies.size > 1) return jsonResponse({ error: "Prepare a separate payroll batch for each contract currency" }, 409, corsHeaders);

  let totalReg = 0, totalOt = 0, totalDt = 0;
  const ticket_ids: string[] = [];
  for (const t of tickets ?? []) {
    ticket_ids.push(t.id);
    const { amount: payRate } = agreedRate(termMap.get(t.id), "payroll");
    const lines = [
      { line_kind: "regular", hours: Number(t.regular_hours ?? 0), rate: payRate },
      { line_kind: "overtime", hours: Number(t.overtime_hours ?? 0), rate: payRate * 1.5 },
      { line_kind: "double_time", hours: Number(t.double_time_hours ?? 0), rate: payRate * 2 },
    ];
    for (const l of lines) {
      if (l.hours > 0) {
        await admin.from("tto_labor_costs").insert({
          agency_id, time_ticket_id: t.id, worker_id: t.worker_id,
          line_kind: l.line_kind, hours: l.hours, rate: l.rate, amount: l.hours * l.rate,
        });
      }
    }
    totalReg += Number(t.regular_hours ?? 0);
    totalOt += Number(t.overtime_hours ?? 0);
    totalDt += Number(t.double_time_hours ?? 0);
    await admin.from("tto_time_tickets").update({ status: "payroll_ready" }).eq("id", t.id).eq("agency_id", agency_id);
  }

  const { data: batch } = await admin.from("tto_payroll_batches").insert({
    agency_id, name, period_start, period_end,
    status: "prepared", ticket_ids,
    totals: { regular_hours: totalReg, overtime_hours: totalOt, double_time_hours: totalDt, ticket_count: ticket_ids.length },
    created_by: auth.user.id,
  }).select().single();

  return jsonResponse({ ok: true, batch }, 200, corsHeaders);
}));
