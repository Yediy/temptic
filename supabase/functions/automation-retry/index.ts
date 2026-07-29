// automation-retry: replay a failed automation run by re-emitting its source event.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withSentry } from "../_shared/sentry.ts";
import { jsonResponse, requireUser } from "../_shared/auth.ts";

Deno.serve(withSentry("automation-retry", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  const body = await req.json().catch(() => ({}));
  const runId = typeof body.run_id === "string" ? body.run_id : null;
  const deadLetterId = typeof body.dead_letter_id === "string" ? body.dead_letter_id : null;
  if (!runId && !deadLetterId) {
    return jsonResponse({ error: "run_id or dead_letter_id required", code: "invalid_input" }, 400, corsHeaders);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let eventId: string | null = null;
  if (runId) {
    const { data } = await auth.userClient.from("ttos_automation_runs").select("event_id").eq("id", runId).maybeSingle();
    eventId = (data as { event_id: string } | null)?.event_id ?? null;
  } else if (deadLetterId) {
    const { data } = await auth.userClient.from("automation_dead_letter").select("event_id").eq("id", deadLetterId).maybeSingle();
    eventId = (data as { event_id: string } | null)?.event_id ?? null;
  }

  if (!eventId) return jsonResponse({ error: "source event not found", code: "not_found" }, 404, corsHeaders);

  // Reset processed state so ttos-dispatch picks it up again
  const { error: uErr } = await admin
    .from("ttos_events")
    .update({ processed_at: null, status: "pending" })
    .eq("id", eventId);
  if (uErr) return jsonResponse({ error: uErr.message, code: "internal" }, 500, corsHeaders);

  await admin.functions.invoke("ttos-dispatch", { body: { event_id: eventId } }).catch(() => {});
  return jsonResponse({ requeued: true, event_id: eventId }, 200, corsHeaders);
}));
