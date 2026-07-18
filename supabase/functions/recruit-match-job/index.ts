// recruit-match-job — thin wrapper over woic-recommend for a specific job order.
// Delegates all ranking to WOIC; excludes protected demographic data.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { withSentry } from "../_shared/sentry.ts";
import { jsonResponse, requireUser } from "../_shared/auth.ts";
import { isUuid, requireAgencyMember } from "../_shared/woic.ts";

Deno.serve(withSentry("recruit-match-job", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);

  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  const body = await req.json().catch(() => null) as { agency_id?: string; job_order_id?: string; limit?: number } | null;
  if (!body || !isUuid(body.agency_id) || !isUuid(body.job_order_id)) {
    return jsonResponse({ error: "agency_id and job_order_id required", code: "bad_request" }, 400, corsHeaders);
  }
  const forbidden = await requireAgencyMember(auth.userClient, body.agency_id!, corsHeaders);
  if (forbidden) return forbidden;

  // Delegate to woic-recommend via edge invocation (kept simple: return recommendations from woic_recommendations).
  const { data, error } = await auth.userClient
    .from("woic_recommendations")
    .select("*")
    .eq("agency_id", body.agency_id)
    .eq("subject_entity", "job")
    .eq("subject_id", body.job_order_id)
    .order("score", { ascending: false })
    .limit(Math.min(Math.max(body.limit ?? 25, 1), 100));
  if (error) return jsonResponse({ error: error.message, code: "internal" }, 500, corsHeaders);
  return jsonResponse({ data }, 200, corsHeaders);
}));
