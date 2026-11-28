// tto-export-batch: build a CSV export for a payroll or billing batch, store it, and lock the batch.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withSentry } from "../_shared/sentry.ts";
import { requireUser, jsonResponse } from "../_shared/auth.ts";
import { type ContractTerms } from "../_shared/contract-rates.ts";
import { buildContractExport } from "../_shared/contract-export.ts";
import { hasAgencyRole, TTO_PAYROLL, TTO_BILLING } from "../_shared/tto_access.ts";

const ELIGIBLE = ["approved", "payroll_ready", "billing_ready", "closed"];

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

  if (!(await hasAgencyRole(admin, auth.user.id, batch.agency_id, kind === "payroll" ? TTO_PAYROLL : TTO_BILLING))) {
    return jsonResponse({ error: "You don't have access to export this batch", code: "forbidden" }, 403, corsHeaders);
  }

  const ids: string[] = batch.ticket_ids ?? [];
  const { data: ticketsRaw } = ids.length
    ? await admin.from("tto_time_tickets").select("*").eq("agency_id", batch.agency_id).in("id", ids).in("status", ELIGIBLE).order("work_date")
    : { data: [] };
  const tickets = ticketsRaw ?? [];
  if (!tickets.length || tickets.length !== new Set(ids).size) return jsonResponse({ error: "Every batch ticket must be approved and belong to this agency.", code: "ineligible_tickets" }, 409, corsHeaders);
  const tIds = tickets.map((t) => t.id);

  const [termsResult, evidenceResult] = await Promise.all([
    admin.from("tto_ticket_terms").select("*").eq("agency_id", batch.agency_id).in("time_ticket_id", tIds),
    admin.from("tto_ticket_evidence").select("time_ticket_id,kind,amount,mileage_total").eq("agency_id", batch.agency_id).in("time_ticket_id", tIds).eq("status", "approved").in("kind", ["expense", "mileage"]),
  ]);
  if (termsResult.error || evidenceResult.error) return jsonResponse({ error: termsResult.error?.message ?? evidenceResult.error?.message }, 500, corsHeaders);
  const termsMap = new Map<string, ContractTerms>((termsResult.data ?? []).map(t => [t.time_ticket_id, t as ContractTerms]));
  const reimb = new Map<string, { exp: number; mile: number }>();
  for (const e of evidenceResult.data ?? []) {
    const cur = reimb.get(e.time_ticket_id) ?? { exp: 0, mile: 0 };
    if (e.kind === "expense") cur.exp += Number(e.amount ?? 0); else cur.mile += Number(e.mileage_total ?? 0);
    reimb.set(e.time_ticket_id, cur);
  }

  let generated: ReturnType<typeof buildContractExport>;
  try { generated = buildContractExport(kind, tickets, termsMap, reimb); }
  catch (e) { return jsonResponse({ error: e instanceof Error ? e.message : "Contract export cannot be generated", code: "invalid_contract_export" }, 409, corsHeaders); }
  const { totals } = generated;

  const path = `${batch.agency_id}/${kind}/${batch.period_start}_${batchId}.csv`;
  const { error: upErr } = await admin.storage.from("tto-exports").upload(path, new Blob([generated.csv], { type: "text/csv" }), { upsert: true, contentType: "text/csv" });
  if (upErr) return jsonResponse({ error: upErr.message, code: "internal" }, 500, corsHeaders);

  const { data: updated, error: updateError } = await admin.from(table).update({
    status: "exported", file_path: path, exported_at: new Date().toISOString(), exported_by: auth.user.id, totals,
  }).eq("id", batchId).select().single();
  if (updateError) return jsonResponse({ error: updateError.message }, 500, corsHeaders);

  await admin.from("tto_audit_events").insert({
    agency_id: batch.agency_id, actor_id: auth.user.id, actor_kind: "agency",
    action: `${kind}.batch_exported`, updated_value: { batch_id: batchId, ...totals },
  });

  return jsonResponse({ ok: true, batch: updated }, 200, corsHeaders);
}));
