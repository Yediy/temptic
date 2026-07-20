import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { jsonResponse, requireUser } from "../_shared/auth.ts";
import { withSentry } from "../_shared/sentry.ts";

const REQS = [
  { key: "identity", label: "Identity verified", weight: 15 },
  { key: "eligibility", label: "Work eligibility (I-9)", weight: 15 },
  { key: "tax_forms", label: "Tax forms signed", weight: 10 },
  { key: "documents", label: "ID documents on file", weight: 10 },
  { key: "background", label: "Background check", weight: 15 },
  { key: "drug_screen", label: "Drug screen", weight: 10 },
  { key: "training", label: "Required training", weight: 15 },
  { key: "signatures", label: "Policy signatures", weight: 10 },
];

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  const { worker_id, client_id } = await req.json().catch(() => ({}));
  if (!worker_id) return jsonResponse({ error: "worker_id required", code: "bad_request" }, 400, corsHeaders);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const [{ data: worker }, { data: docs }, { data: training }, { data: signatures }, { data: compliance }] = await Promise.all([
    admin.from("workers").select("id, agency_id, user_id").eq("id", worker_id).maybeSingle(),
    admin.from("worker_documents").select("id, doc_type").eq("worker_id", worker_id),
    admin.from("training_enrollments").select("id, status").eq("worker_id", worker_id),
    admin.from("document_signatures").select("id").eq("worker_id", worker_id),
    admin.from("passport_compliance").select("status, item_key").eq("worker_id", worker_id),
  ]);
  if (!worker) return jsonResponse({ error: "worker not found", code: "not_found" }, 404, corsHeaders);

  const doneMap: Record<string, boolean> = {
    identity: (compliance ?? []).some((c: any) => c.item_key === "identity" && c.status === "verified"),
    eligibility: (compliance ?? []).some((c: any) => c.item_key === "eligibility" && c.status === "verified"),
    tax_forms: (signatures ?? []).length > 0,
    documents: (docs ?? []).length > 0,
    background: (compliance ?? []).some((c: any) => c.item_key === "background" && c.status === "verified"),
    drug_screen: (compliance ?? []).some((c: any) => c.item_key === "drug_screen" && c.status === "verified"),
    training: (training ?? []).some((t: any) => t.status === "completed"),
    signatures: (signatures ?? []).length > 0,
  };

  const breakdown: Record<string, { done: boolean; weight: number; label: string }> = {};
  let score = 0;
  const missing: Array<{ key: string; label: string }> = [];
  for (const r of REQS) {
    const done = !!doneMap[r.key];
    breakdown[r.key] = { done, weight: r.weight, label: r.label };
    if (done) score += r.weight;
    else missing.push({ key: r.key, label: r.label });
  }
  const ready = score >= 90;

  const { error } = await admin.from("assignment_readiness").upsert(
    {
      agency_id: worker.agency_id,
      worker_id,
      client_id: client_id ?? null,
      score,
      ready,
      breakdown,
      missing,
      computed_at: new Date().toISOString(),
    },
    { onConflict: "worker_id,client_id" },
  );
  if (error) return jsonResponse({ error: error.message, code: "db_error" }, 500, corsHeaders);

  return jsonResponse({ score, ready, breakdown, missing }, 200, corsHeaders);
}

Deno.serve(withSentry("onboarding-readiness", handler));
