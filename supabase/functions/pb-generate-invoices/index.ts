// pb-generate-invoices: turn approved TTO tickets into client invoices.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withSentry } from "../_shared/sentry.ts";
import { requireUser, jsonResponse } from "../_shared/auth.ts";

Deno.serve(withSentry("pb-generate-invoices", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON", code: "bad_request" }, 400, corsHeaders); }
  const agency_id = String(body.agency_id ?? "");
  const period_start = String(body.period_start ?? "");
  const period_end = String(body.period_end ?? "");
  const source_batch_id = body.source_batch_id ? String(body.source_batch_id) : null;
  if (!agency_id || !period_start || !period_end)
    return jsonResponse({ error: "agency_id, period_start, period_end required", code: "bad_request" }, 400, corsHeaders);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: tickets, error } = await admin.from("tto_time_tickets")
    .select("*").eq("agency_id", agency_id)
    .in("status", ["approved", "payroll_ready", "billed"])
    .gte("work_date", period_start).lte("work_date", period_end);
  if (error) return jsonResponse({ error: error.message, code: "db_error" }, 500, corsHeaders);

  const { data: rates } = await admin.from("pb_client_bill_rates")
    .select("client_id, rate_type, amount, markup_pct").eq("agency_id", agency_id);
  type BR = { client_id: string; rate_type: string; amount: number; markup_pct: number };
  const rateMap = new Map<string, Map<string, { amount: number; markup: number }>>();
  for (const r of (rates ?? []) as BR[]) {
    if (!rateMap.has(r.client_id)) rateMap.set(r.client_id, new Map());
    rateMap.get(r.client_id)!.set(r.rate_type, { amount: Number(r.amount) || 0, markup: Number(r.markup_pct) || 0 });
  }
  const getBill = (cid: string, kind: string) => rateMap.get(cid)?.get(kind) ?? { amount: 0, markup: 0 };

  // Group tickets by client
  const byClient = new Map<string, typeof tickets>();
  for (const t of tickets ?? []) {
    if (!t.client_id) continue;
    const arr = byClient.get(t.client_id) ?? [];
    arr.push(t);
    byClient.set(t.client_id, arr);
  }

  const invoices: Array<{ id: string; client_id: string; total: number }> = [];

  for (const [client_id, list] of byClient) {
    const { data: last } = await admin.from("pb_invoices")
      .select("number").eq("agency_id", agency_id).order("created_at", { ascending: false }).limit(1);
    const seq = (last?.[0]?.number?.match(/\d+$/)?.[0] ?? "0");
    const nextNum = `INV-${new Date().getFullYear()}-${String(Number(seq) + 1).padStart(6, "0")}`;

    let subtotal = 0;
    const items: Array<Record<string, unknown>> = [];
    for (const t of list!) {
      const reg = Number(t.regular_hours ?? 0);
      const ot = Number(t.overtime_hours ?? 0);
      const dt = Number(t.double_time_hours ?? 0);
      const regB = getBill(client_id, "regular");
      const otB = getBill(client_id, "overtime");
      const dtB = getBill(client_id, "double_time");
      const rows = [
        { kind: "regular", hours: reg, bill: regB },
        { kind: "overtime", hours: ot, bill: otB },
        { kind: "double_time", hours: dt, bill: dtB },
      ];
      for (const r of rows) {
        if (r.hours <= 0) continue;
        const base = r.hours * r.bill.amount;
        const markup = +(base * (r.bill.markup / 100)).toFixed(2);
        const amount = +(base + markup).toFixed(2);
        subtotal += amount;
        items.push({
          agency_id, ticket_id: t.id, worker_id: t.worker_id,
          description: `${r.kind} hours (${t.work_date})`,
          hours: r.hours, bill_rate: r.bill.amount, markup, amount,
        });
      }
    }
    const tax = 0, credits = 0;
    const total = +(subtotal + tax - credits).toFixed(2);

    const { data: inv } = await admin.from("pb_invoices").insert({
      agency_id, client_id, number: nextNum, status: "draft",
      period_start, period_end, subtotal: +subtotal.toFixed(2),
      tax, credits, total, source_batch_id, created_by: auth.user.id,
    }).select().single();
    if (!inv) continue;

    if (items.length) {
      await admin.from("pb_invoice_items").insert(items.map((i) => ({ ...i, invoice_id: inv.id })));
    }
    invoices.push({ id: inv.id, client_id, total });

    await admin.from("ttos_events").insert({
      agency_id, event_type: "invoice.created", subject_type: "pb_invoice",
      subject_id: inv.id, payload: { total, client_id, item_count: items.length }, actor_id: auth.user.id,
    }).then(() => null, () => null);
  }

  return jsonResponse({ ok: true, invoices, count: invoices.length }, 200, corsHeaders);
}));
