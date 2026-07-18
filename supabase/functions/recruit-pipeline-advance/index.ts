// recruit-pipeline-advance — moves a pipeline entry to a new stage and emits
// a TTOS event so downstream automations (tasks, notifications) can react.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { withSentry } from "../_shared/sentry.ts";
import { jsonResponse, requireUser } from "../_shared/auth.ts";
import { isUuid, requireAgencyMember } from "../_shared/woic.ts";

Deno.serve(withSentry("recruit-pipeline-advance", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);

  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  const body = await req.json().catch(() => null) as {
    agency_id?: string; entry_id?: string; stage_id?: string; notes?: string;
  } | null;
  if (!body || !isUuid(body.agency_id) || !isUuid(body.entry_id) || !isUuid(body.stage_id)) {
    return jsonResponse({ error: "agency_id, entry_id, stage_id required", code: "bad_request" }, 400, corsHeaders);
  }
  const forbidden = await requireAgencyMember(auth.userClient, body.agency_id!, corsHeaders);
  if (forbidden) return forbidden;

  const { data: entry, error: updateErr } = await auth.userClient
    .from("recruit_pipeline_entries")
    .update({ stage_id: body.stage_id, notes: body.notes ?? null, entered_at: new Date().toISOString() })
    .eq("id", body.entry_id)
    .eq("agency_id", body.agency_id)
    .select()
    .maybeSingle();
  if (updateErr) return jsonResponse({ error: updateErr.message, code: "internal" }, 500, corsHeaders);
  if (!entry) return jsonResponse({ error: "not_found", code: "not_found" }, 404, corsHeaders);

  // Emit TTOS event (best-effort, non-blocking on failure).
  await auth.userClient.from("ttos_events").insert({
    agency_id: body.agency_id,
    kind: "recruit.pipeline.advanced",
    actor_id: auth.user.id,
    subject_entity: "pipeline_entry",
    subject_id: entry.id,
    payload: { stage_id: body.stage_id, worker_id: entry.worker_id, job_order_id: entry.job_order_id },
  } as never).then(() => {}).catch(() => {});

  return jsonResponse({ data: entry }, 200, corsHeaders);
}));
