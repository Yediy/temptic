// Agency requests access to a passport. Creates a pending permission and notifies owner.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { jsonResponse, requireUser } from "../_shared/auth.ts";
import { withSentry } from "../_shared/sentry.ts";

Deno.serve(withSentry("passport-request-access", async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;
  const gate = { ok: true as const, user: auth.user, userClient: auth.userClient, response: undefined as never };
  
  const { user, userClient } = gate;

  let body: { passport_id?: string; agency_id?: string; scopes?: string[]; expires_at?: string | null; note?: string };
  try { body = await req.json(); } catch { body = {}; }
  const { passport_id: passportId, agency_id: agencyId, scopes = [], expires_at: expiresAt = null, note } = body;
  if (!passportId || !agencyId) return jsonResponse({ error: "passport_id and agency_id required", code: "bad_request" }, 400, corsHeaders);

  // Verify caller is a member of agency.
  const { data: member } = await userClient
    .from("agency_members").select("agency_id")
    .eq("agency_id", agencyId).eq("user_id", user.id).eq("is_active", true).maybeSingle();
  if (!member) return jsonResponse({ error: "forbidden", code: "forbidden" }, 403, corsHeaders);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data, error } = await admin.from("passport_permissions").insert({
    passport_id: passportId,
    grantee_type: "agency",
    grantee_id: agencyId,
    scopes,
    status: "pending",
    requested_by: user.id,
    expires_at: expiresAt,
    note: note ?? null,
  }).select("id").single();
  if (error) return jsonResponse({ error: error.message, code: "server_error" }, 500, corsHeaders);

  await admin.from("passport_access_log").insert({
    passport_id: passportId,
    actor_id: user.id,
    actor_type: "agency",
    action: "request_access",
    resource: agencyId,
    metadata: { scopes, expires_at: expiresAt },
  });

  return jsonResponse({ ok: true, permission_id: data.id }, 200, corsHeaders);
}));
