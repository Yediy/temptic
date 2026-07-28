import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { withSentry } from "../_shared/sentry.ts";
import { jsonResponse, requireUser } from "../_shared/auth.ts";

Deno.serve(withSentry("cc-client-advisor", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  const { client_id } = (await req.json().catch(() => ({}))) as { client_id?: string };
  if (!client_id) return jsonResponse({ error: "client_id required", code: "bad_request" }, 400, corsHeaders);

  const { userClient } = auth;
  const { data: client } = await userClient.from("clients").select("id, agency_id, name").eq("id", client_id).maybeSingle();
  if (!client) return jsonResponse({ error: "client_not_found", code: "not_found" }, 404, corsHeaders);

  // Pull WOIC recommendations scoped to this client subject
  const { data: recs } = await userClient
    .from("woic_recommendations")
    .select("id, subject_entity, subject_id, category, title, body, score, created_at")
    .eq("agency_id", client.agency_id)
    .eq("subject_entity", "client")
    .eq("subject_id", client.id)
    .order("score", { ascending: false })
    .limit(25);

  return jsonResponse({ data: { recommendations: recs ?? [] } }, 200, corsHeaders);
}));
