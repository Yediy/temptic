// tto-export-batch: build a CSV export for a payroll or billing batch, store it, and lock the batch.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withSentry } from "../_shared/sentry.ts";
import { requireUser, jsonResponse } from "../_shared/auth.ts";

const OT = 1.5, DT = 2;
const PAYROLL_ROLES = ["agency_admin", "payroll", "payroll_specialist"];
const BILLING_ROLES = ["agency_admin", "payroll", "billing_specialist"];
const ELIGIBLE = ["approved", "payroll_ready", "billing_ready", "closed"];

const esc = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const csv = (rows: unknown[][]) => rows.map((r) => r.map(esc).join(",")).join("\n") + "\n";
const r2 = (n: number) => Math.round(n * 100) / 100;

function rateFor<T extends { effective_from: string | null; effective_to: string | null }>(rates: T[], day: string) {
  return rates.filter((r) => (!r.effective_from || r.effective_from <= day) && (!r.effective_to || r.effective_to >= day))
    .sort((a, b) => String(b.effective_from ?? "").localeCompare(String(a.effective_from ?? "")))[0];
}

Deno.serve(withSentry("tto-export-batch", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON", code: "bad_request" }, 400, corsHeaders); }
  const kind = body.kind === "billing" ? "billing" : body.kind === "payroll" ? "payroll" : null;
  const batchId = String(body.batch_id ?? "");
  if (!kind || !/^[0-9a-f-]{36}$/i.test(batchId)) return jsonResponse({ error: "kind and batch_id required", code: "bad_request" }, 400, corsHeaders);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const table = kind === "payroll" ? "tto_payroll_batches" : "tto_billing_batches";
  const { data: batch } = await admin.from(table).select("*").eq("id", batchId).maybeSingle();
  if (!batch) return jsonResponse({ error: "Batch not found", code: "not_found" }, 404, corsHeaders);

  const [{ data: roles }, { data: member }] = await Promise.all([
    admin.from("user_roles").select("role").eq("user_id", auth.user.id),
    admin.from("agency_members").select("agency_id").eq("user_id", auth.user.id).eq("agency_id", batch.agency_id).maybeSingle(),
  ]);
  const allowed = kind === "payroll" ? PAYROLL_ROLES : BILLING_ROLES;
  if (!member || !(roles ?? []).some((r) => allowed.includes(r.role))) {
    return jsonResponse({ error: "You don't have access to export this batch", code: "forbidden" }, 403, corsHeaders);
  }

  const ids: string[] = batch.ticket_ids ?? [];
  const { data: ticketsRaw } = ids.length
    ? await admin.from("tto_time_tickets").select("*").in("id", ids).in("status", ELIGIBLE).order("work_date")
    : { data: [] };
  const tickets = ticketsRaw ?? [];
  const tIds = tickets.map((t) => t.id);
  const workerIds = [...new Set(tickets.map((t) => t.worker_id))];
  const clientIds = [...new Set(tickets.map((t) => t.client_id).filter(Boolean))];

  const [{ data: workers }, { data: clients }, { data: evidence }, { data: payRates }, { data: billRates }] = await Promise.all([
    workerIds.length ? admin.from("workers").select("id,worker_code,first_name,last_name").in("id", workerIds) : { data: [] },
    clientIds.length ? admin.from("clients").select("id,company_name").in("id", clientIds) : { data: [] },
    tIds.length ? admin.from("tto_ticket_evidence").select("time_ticket_id,kind,amount,mileage_total").in("time_ticket_id", tIds).eq("status", "approved").in("kind", ["expense", "mileage"]) : { data: [] },
    workerIds.length ? admin.from("pb_worker_pay_rates").select("*").eq("agency_id", batch.agency_id).in("worker_id", workerIds) : { data: [] },
    clientIds.length ? admin.from("pb_client_bill_rates").select("*").eq("agency_id", batch.agency_id).in("client_id", clientIds) : { data: [] },
  ]);
  const wMap = new Map((workers ?? []).map((w) => [w.id, w]));
  const cMap = new Map((clients ?? []).map((c) => [c.id, c.company_name]));
  const reimb = new Map<string, { exp: number; mile: number }>();
  for (const e of evidence ?? []) {
    const cur = reimb.get(e.time_ticket_id) ?? { exp: 0, mile: 0 };
    if (e.kind === "expense") cur.exp += Number(e.amount ?? 0); else cur.mile += Number(e.mileage_total ?? 0);
    reimb.set(e.time_ticket_id, cur);
  }

  const missingRates = new Set<string>();
  let reg = 0, ot = 0, dt = 0, gross = 0, reimbTotal = 0;
  let rows: unknown[][];

  if (kind === "payroll") {
    rows = [["work_date", "worker_code", "worker_name", "client", "ticket_id", "regular_hours", "overtime_hours", "double_time_hours", "pay_rate", "regular_pay", "overtime_pay", "double_time_pay", "expenses", "mileage", "total_pay"]];
    for (const t of tickets) {
      const w = wMap.get(t.worker_id);
      const rate = rateFor((payRates ?? []).filter((r) => r.worker_id === t.worker_id), t.work_date);
      const pr = Number(rate?.amount ?? 0);
      if (!rate) missingRates.add(`${w?.first_name ?? ""} ${w?.last_name ?? ""}`.trim() || t.worker_id);
      const h = [Number(t.regular_hours ?? 0), Number(t.overtime_hours ?? 0), Number(t.double_time_hours ?? 0)];
      const pay = [r2(h[0] * pr), r2(h[1] * pr * OT), r2(h[2] * pr * DT)];
      const rb = reimb.get(t.id) ?? { exp: 0, mile: 0 };
      const total = r2(pay[0] + pay[1] + pay[2] + rb.exp + rb.mile);
      reg += h[0]; ot += h[1]; dt += h[2]; gross += pay[0] + pay[1] + pay[2]; reimbTotal += rb.exp + rb.mile;
      rows.push([t.work_date, w?.worker_code, `${w?.first_name ?? ""} ${w?.last_name ?? ""}`.trim(), cMap.get(t.client_id) ?? "", t.id, ...h, pr, ...pay, r2(rb.exp), r2(rb.mile), total]);
    }
  } else {
    rows = [["work_date", "client", "worker_name", "ticket_id", "regular_hours", "overtime_hours", "double_time_hours", "bill_rate", "regular_amount", "overtime_amount", "double_time_amount", "expenses", "mileage", "total_amount"]];
    for (const t of tickets) {
      const w = wMap.get(t.worker_id);
      const rate = rateFor((billRates ?? []).filter((r) => r.client_id === t.client_id), t.work_date);
      const br = rate ? r2(Number(rate.amount ?? 0) * (1 + Number(rate.markup_pct ?? 0) / 100)) : 0;
      if (!rate) missingRates.add(cMap.get(t.client_id) ?? "No client");
      const h = [Number(t.regular_hours ?? 0), Number(t.overtime_hours ?? 0), Number(t.double_time_hours ?? 0)];
      const amt = [r2(h[0] * br), r2(h[1] * br * OT), r2(h[2] * br * DT)];
      const rb = reimb.get(t.id) ?? { exp: 0, mile: 0 };
      const total = r2(amt[0] + amt[1] + amt[2] + rb.exp + rb.mile);
      reg += h[0]; ot += h[1]; dt += h[2]; gross += amt[0] + amt[1] + amt[2]; reimbTotal += rb.exp + rb.mile;
      rows.push([t.work_date, cMap.get(t.client_id) ?? "", `${w?.first_name ?? ""} ${w?.last_name ?? ""}`.trim(), t.id, ...h, br, ...amt, r2(rb.exp), r2(rb.mile), total]);
    }
  }
  rows.push([]);
  rows.push(["TOTAL", "", "", "", r2(reg), r2(ot), r2(dt), "", "", "", "", "", r2(reimbTotal), r2(gross + reimbTotal)]);

  const path = `${batch.agency_id}/${kind}/${batch.period_start}_${batchId}.csv`;
  const { error: upErr } = await admin.storage.from("tto-exports").upload(path, new Blob([csv(rows)], { type: "text/csv" }), { upsert: true, contentType: "text/csv" });
  if (upErr) return jsonResponse({ error: upErr.message, code: "internal" }, 500, corsHeaders);

  const totals = {
    ticket_count: tickets.length, regular_hours: r2(reg), overtime_hours: r2(ot), double_time_hours: r2(dt),
    [kind === "payroll" ? "gross_pay" : "amount"]: r2(gross), reimbursements: r2(reimbTotal), grand_total: r2(gross + reimbTotal),
    missing_rates: [...missingRates],
  };
  const { data: updated } = await admin.from(table).update({
    status: "exported", file_path: path, exported_at: new Date().toISOString(), exported_by: auth.user.id, totals,
  }).eq("id", batchId).select().single();

  await admin.from("tto_audit_events").insert({
    agency_id: batch.agency_id, actor_id: auth.user.id, actor_kind: "agency",
    action: `${kind}.batch_exported`, updated_value: { batch_id: batchId, ...totals },
  });

  return jsonResponse({ ok: true, batch: updated }, 200, corsHeaders);
}));
