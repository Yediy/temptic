// pb-record-payment: log a payment against an invoice and update status.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withSentry } from "../_shared/sentry.ts";
import { requireUser, jsonResponse } from "../_shared/auth.ts";

Deno.serve(withSentry("pb-record-payment", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON", code: "bad_request" }, 400, corsHeaders); }
  const invoice_id = String(body.invoice_id ?? "");
  const amount = Number(body.amount ?? 0);
  const method = String(body.method ?? "manual");
  const reference = body.reference ? String(body.reference) : null;
  const provider_event_id = body.provider_event_id ? String(body.provider_event_id) : null;
  if (!invoice_id || amount <= 0) return jsonResponse({ error: "invoice_id and positive amount required", code: "bad_request" }, 400, corsHeaders);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: inv, error } = await admin.from("pb_invoices").select("*").eq("id", invoice_id).maybeSingle();
  if (error || !inv) return jsonResponse({ error: "Invoice not found", code: "not_found" }, 404, corsHeaders);

  await admin.from("pb_invoice_payments").insert({
    invoice_id, agency_id: inv.agency_id, amount, method, reference,
    provider_event_id, recorded_by: auth.user.id,
  });

  const { data: pays } = await admin.from("pb_invoice_payments").select("amount").eq("invoice_id", invoice_id);
  const paid = (pays ?? []).reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const nextStatus = paid >= Number(inv.total) ? "paid" : inv.status;
  await admin.from("pb_invoices").update({
    status: nextStatus, paid_at: nextStatus === "paid" ? new Date().toISOString() : inv.paid_at,
  }).eq("id", invoice_id);

  await admin.from("ttos_events").insert({
    agency_id: inv.agency_id, event_type: nextStatus === "paid" ? "invoice.paid" : "invoice.payment_recorded",
    subject_type: "pb_invoice", subject_id: invoice_id,
    payload: { amount, method, paid_total: paid }, actor_id: auth.user.id,
  }).then(() => null, () => null);

  return jsonResponse({ ok: true, status: nextStatus, paid_total: paid }, 200, corsHeaders);
}));
