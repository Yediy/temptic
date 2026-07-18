// recruit-score-candidate — computes reliability/reputation/performance scores
// from existing workforce signals and upserts recruit_candidate_scores.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { withSentry } from "../_shared/sentry.ts";
import { jsonResponse, requireUser } from "../_shared/auth.ts";
import { isUuid, requireAgencyMember } from "../_shared/woic.ts";

Deno.serve(withSentry("recruit-score-candidate", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);

  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  const body = await req.json().catch(() => null) as { agency_id?: string; worker_id?: string } | null;
  if (!body || !isUuid(body.agency_id) || !isUuid(body.worker_id)) {
    return jsonResponse({ error: "agency_id and worker_id required", code: "bad_request" }, 400, corsHeaders);
  }
  const forbidden = await requireAgencyMember(auth.userClient, body.agency_id!, corsHeaders);
  if (forbidden) return forbidden;

  const client = auth.userClient;
  const [{ count: signedCt }, { count: rejectedCt }, { count: placementCt }] = await Promise.all([
    client.from("ticket_signatures").select("id", { count: "exact", head: true }).eq("worker_id", body.worker_id),
    client.from("tickets").select("id", { count: "exact", head: true }).eq("worker_id", body.worker_id).eq("status", "rejected"),
    client.from("placements").select("id", { count: "exact", head: true }).eq("worker_id", body.worker_id),
  ]);
  const signed = signedCt ?? 0;
  const rejected = rejectedCt ?? 0;
  const placements = placementCt ?? 0;
  const total = Math.max(signed + rejected, 1);
  const reliability = Math.round((signed / total) * 100 * 100) / 100;
  const performance = Math.min(100, placements * 10 + reliability * 0.3);
  const reputation = Math.round((reliability * 0.6 + performance * 0.4) * 100) / 100;

  const factors = { signed, rejected, placements };
  const { data, error } = await client.from("recruit_candidate_scores").upsert({
    agency_id: body.agency_id,
    worker_id: body.worker_id,
    reliability_score: reliability,
    performance_score: performance,
    reputation_score: reputation,
    factors,
    last_computed_at: new Date().toISOString(),
  }, { onConflict: "agency_id,worker_id" }).select().maybeSingle();
  if (error) return jsonResponse({ error: error.message, code: "internal" }, 500, corsHeaders);
  return jsonResponse({ data }, 200, corsHeaders);
}));
