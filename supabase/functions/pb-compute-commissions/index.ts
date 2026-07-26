// pb-compute-commissions: apply commission rules to invoices.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withSentry } from "../_shared/sentry.ts";
import { requireUser, jsonResponse } from "../_shared/auth.ts";

Deno.serve(withSentry("pb-compute-commissions", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON", code: "bad_request" }, 400, corsHeaders); }
  const agency_id = String(body.agency_id ?? "");
  const invoice_ids = Array.isArray(body.invoice_ids) ? (body.invoice_ids as string[]) : [];
  if (!agency_id) return jsonResponse({ error: "agency_id required", code: "bad_request" }, 400, corsHeaders);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: rules } = await admin.from("pb_commission_rules")
    .select("*").eq("agency_id", agency_id).eq("active", true);

  let invoicesQ = admin.from("pb_invoices").select("*").eq("agency_id", agency_id);
  if (invoice_ids.length) invoicesQ = invoicesQ.in("id", invoice_ids);
  else invoicesQ = invoicesQ.in("status", ["approved", "sent", "paid"]);

  const { data: invoices } = await invoicesQ;
  const created: string[] = [];

  for (const inv of invoices ?? []) {
    for (const rule of rules ?? []) {
      const cfg = (rule.config ?? {}) as Record<string, unknown>;
      const rate = Number(cfg.rate ?? 0);
      const recruiter_id = rule.recruiter_id ?? cfg.recruiter_id ?? null;
      if (!recruiter_id || rate <= 0) continue;

      let basis = 0;
      if (rule.rule_type === "placement" || rule.rule_type === "margin") basis = Number(inv.total ?? 0);
      else if (rule.rule_type === "referral") basis = Number(cfg.flat ?? 0);
      else basis = Number(inv.total ?? 0);

      const amount = +(basis * rate).toFixed(2);
      const { data: rec } = await admin.from("pb_commission_records").insert({
        agency_id, recruiter_id, rule_id: rule.id, invoice_id: inv.id,
        basis_amount: basis, rate, amount, status: "pending",
      }).select().single();
      if (rec) created.push(rec.id);
    }
  }

  await admin.from("ttos_events").insert({
    agency_id, event_type: "commission.computed", subject_type: "agency",
    subject_id: agency_id, payload: { count: created.length }, actor_id: auth.user.id,
  }).then(() => null, () => null);

  return jsonResponse({ ok: true, count: created.length }, 200, corsHeaders);
}));
