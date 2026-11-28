// pb-generate-invoices: turn approved TTO tickets into client invoices.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withSentry } from "../_shared/sentry.ts";
import { requireUser, jsonResponse } from "../_shared/auth.ts";
import { requirePbAccess } from "../_shared/pb_access.ts";
import { buildContractInvoices } from "../_shared/contract-invoice.ts";
import type { ContractTerms } from "../_shared/contract-rates.ts";

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
  const access = await requirePbAccess({ admin, req, user: auth.user, functionName: "pb-generate-invoices", action: "invoice.generate", agencyId: agency_id, subjectType: "agency", subjectId: agency_id, corsHeaders });
  if (access instanceof Response) return access;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(period_start) || !/^\d{4}-\d{2}-\d{2}$/.test(period_end) || period_end < period_start)
    return jsonResponse({ error: "Choose a valid period", code: "bad_request" }, 400, corsHeaders);
  const { data: tickets, error } = await admin.from("tto_time_tickets")
    .select("id, client_id, worker_id, work_date, regular_hours, overtime_hours, double_time_hours").eq("agency_id", agency_id)
    .in("status", ["approved", "payroll_ready", "billing_ready", "closed"])
    .gte("work_date", period_start).lte("work_date", period_end).limit(1000);
  if (error) return jsonResponse({ error: error.message, code: "db_error" }, 500, corsHeaders);
  const ids = (tickets ?? []).map(t => t.id);
  const terms = new Map<string, ContractTerms>(); const invoiced = new Set<string>();
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const [tr, ir] = await Promise.all([
      admin.from("tto_ticket_terms").select("*").eq("agency_id", agency_id).in("time_ticket_id", chunk),
      admin.from("pb_invoice_items").select("ticket_id").eq("agency_id", agency_id).in("ticket_id", chunk),
    ]);
    if (tr.error || ir.error) return jsonResponse({ error: (tr.error ?? ir.error)!.message, code: "db_error" }, 500, corsHeaders);
    for (const t of tr.data ?? []) terms.set(t.time_ticket_id, t as ContractTerms);
    for (const r of ir.data ?? []) if (r.ticket_id) invoiced.add(r.ticket_id);
  }
  const built = buildContractInvoices(tickets ?? [], terms, invoiced);
  const invoices: Array<{ id: string; number: string; client_id: string; currency: string; total: number }> = [];
  for (const g of built.invoices) {
    const { data: last } = await admin.from("pb_invoices").select("number").eq("agency_id", agency_id).order("created_at", { ascending: false }).limit(1);
    const seq = Number(last?.[0]?.number?.match(/\d+$/)?.[0] ?? "0");
    const number = `INV-${new Date().getFullYear()}-${String(seq + 1).padStart(6, "0")}`;
    const { data: inv, error: ie } = await admin.from("pb_invoices").insert({
      agency_id, client_id: g.client_id, number, status: "draft", period_start, period_end,
      subtotal: g.subtotal, tax: 0, credits: 0, total: g.subtotal, source_batch_id, created_by: auth.user.id,
      notes: `Currency: ${g.currency}. Billed at agreed contract rates.`,
    }).select().single();
    if (ie || !inv) return jsonResponse({ error: ie?.message ?? "Invoice not created", code: "db_error", invoices }, 500, corsHeaders);
    const { error: itemErr } = await admin.from("pb_invoice_items").insert(g.items.map(i => ({ ...i, agency_id, invoice_id: inv.id })));
    if (itemErr) { await admin.from("pb_invoices").delete().eq("id", inv.id); return jsonResponse({ error: itemErr.message, code: "db_error", invoices }, 500, corsHeaders); }
    invoices.push({ id: inv.id, number, client_id: g.client_id, currency: g.currency, total: g.subtotal });
    await admin.from("ttos_events").insert({ agency_id, event_type: "invoice.created", subject_type: "pb_invoice", subject_id: inv.id, payload: { total: g.subtotal, currency: g.currency, item_count: g.items.length }, actor_id: auth.user.id }).then(() => null, () => null);
  }
  return jsonResponse({ ok: true, invoices, count: invoices.length, skipped: built.skipped }, 200, corsHeaders);
}));
