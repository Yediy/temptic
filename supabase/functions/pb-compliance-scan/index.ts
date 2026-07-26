// pb-compliance-scan: check a payroll run against basic rules (OT, missing rate, etc.).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withSentry } from "../_shared/sentry.ts";
import { requireUser, jsonResponse } from "../_shared/auth.ts";

Deno.serve(withSentry("pb-compliance-scan", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON", code: "bad_request" }, 400, corsHeaders); }
  const run_id = String(body.run_id ?? "");
  if (!run_id) return jsonResponse({ error: "run_id required", code: "bad_request" }, 400, corsHeaders);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: run } = await admin.from("pb_payroll_runs").select("*").eq("id", run_id).maybeSingle();
  if (!run) return jsonResponse({ error: "Run not found", code: "not_found" }, 404, corsHeaders);

  const { data: items } = await admin.from("pb_payroll_items").select("*").eq("run_id", run_id);
  const findings: Array<{ category: string; severity: string; message: string; item_id: string }> = [];
  for (const it of items ?? []) {
    const totalHours = Number(it.regular_hours ?? 0) + Number(it.ot_hours ?? 0) + Number(it.dt_hours ?? 0);
    if (totalHours > 60)
      findings.push({ category: "excessive_hours", severity: "warning", message: `Worker ${it.worker_id} logged ${totalHours}h`, item_id: it.id });
    if (Number(it.gross_pay) > 0 && Number(it.taxes) === 0)
      findings.push({ category: "missing_taxes", severity: "error", message: `No taxes computed on gross ${it.gross_pay}`, item_id: it.id });
    if (Number(it.net_pay) < 0)
      findings.push({ category: "negative_net", severity: "critical", message: `Negative net pay`, item_id: it.id });
  }
  if (findings.length) {
    await admin.from("pb_payroll_exceptions").insert(
      findings.map((f) => ({ run_id, agency_id: run.agency_id, ...f })),
    );
  }
  return jsonResponse({ ok: true, findings: findings.length }, 200, corsHeaders);
}));
