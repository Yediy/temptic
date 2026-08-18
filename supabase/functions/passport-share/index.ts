// Owner-only management of temporary passport share links.
// Tokens are generated server-side, returned exactly once, and only their
// SHA-256 hash is persisted. The browser can no longer insert share rows.
//
// POST { action: "create", passport_id, label?, scopes?, expires_in_hours?, max_uses? }
// POST { action: "revoke", link_id, reason? }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { jsonResponse, requireUser } from "../_shared/auth.ts";
import { withSentry } from "../_shared/sentry.ts";
import { isScope, sha256Hex, PASSPORT_SCOPES } from "../_shared/passport-api.ts";

export default {};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TTL_HOURS = 24 * 30;

function newToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(withSentry("passport-share", async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;
  const { user } = auth;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { body = {}; }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const ownsPassport = async (passportId: string) => {
    const { data } = await admin
      .from("workforce_passports").select("id, worker_id").eq("id", passportId).maybeSingle();
    if (!data) return false;
    const { data: worker } = await admin
      .from("workers").select("user_id").eq("id", (data as { worker_id: string }).worker_id).maybeSingle();
    return (worker as { user_id: string | null } | null)?.user_id === user.id;
  };

  const action = body.action === "revoke" ? "revoke" : "create";

  if (action === "revoke") {
    const linkId = typeof body.link_id === "string" ? body.link_id : "";
    if (!UUID_RE.test(linkId)) {
      return jsonResponse({ error: "link_id required", code: "bad_request" }, 400, corsHeaders);
    }
    const { data: link } = await admin
      .from("passport_sharing").select("id, passport_id, revoked_at").eq("id", linkId).maybeSingle();
    if (!link) return jsonResponse({ error: "not_found", code: "not_found" }, 404, corsHeaders);
    if (!(await ownsPassport((link as { passport_id: string }).passport_id))) {
      return jsonResponse({ error: "You do not have permission to perform this action.", code: "forbidden" }, 403, corsHeaders);
    }
    await admin.from("passport_sharing").update({
      revoked_at: (link as { revoked_at: string | null }).revoked_at ?? new Date().toISOString(),
      revoked_by: user.id,
      revoked_reason: typeof body.reason === "string" ? body.reason.slice(0, 200) : null,
      updated_at: new Date().toISOString(),
    }).eq("id", linkId);

    await admin.from("passport_access_log").insert({
      passport_id: (link as { passport_id: string }).passport_id,
      actor_id: user.id,
      actor_type: "owner",
      action: "share_link_revoked",
      resource: linkId,
      metadata: {},
    }).then(() => null, () => null);

    return jsonResponse({ ok: true }, 200, corsHeaders);
  }

  const passportId = typeof body.passport_id === "string" ? body.passport_id : "";
  if (!UUID_RE.test(passportId)) {
    return jsonResponse({ error: "passport_id required", code: "bad_request" }, 400, corsHeaders);
  }
  if (!(await ownsPassport(passportId))) {
    return jsonResponse({ error: "You do not have permission to perform this action.", code: "forbidden" }, 403, corsHeaders);
  }

  const rawScopes = Array.isArray(body.scopes) ? body.scopes : [];
  const scopes = rawScopes.filter(isScope);
  if (rawScopes.length && scopes.length !== rawScopes.length) {
    return jsonResponse({ error: "unknown scope requested", code: "bad_request" }, 400, corsHeaders);
  }
  const effectiveScopes = scopes.length ? scopes : ["identity", "skills", "credentials", "training", "work_history"];

  const hours = Math.min(
    MAX_TTL_HOURS,
    Math.max(1, Number.isFinite(Number(body.expires_in_hours)) ? Math.floor(Number(body.expires_in_hours)) : 168),
  );
  const maxUses = Math.min(50, Math.max(1, Number.isFinite(Number(body.max_uses)) ? Math.floor(Number(body.max_uses)) : 1));

  const token = newToken();
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + hours * 3600_000).toISOString();

  const { data: inserted, error } = await admin.from("passport_sharing").insert({
    passport_id: passportId,
    token_hash: tokenHash,
    label: typeof body.label === "string" && body.label.trim() ? body.label.trim().slice(0, 120) : null,
    scopes: effectiveScopes,
    expires_at: expiresAt,
    max_uses: maxUses,
    one_time: maxUses === 1,
    created_by: user.id,
  }).select("id, expires_at, scopes, max_uses, one_time").single();

  if (error) return jsonResponse({ error: "Could not create share link.", code: "server_error" }, 500, corsHeaders);

  await admin.from("passport_access_log").insert({
    passport_id: passportId,
    actor_id: user.id,
    actor_type: "owner",
    action: "share_link_created",
    resource: (inserted as { id: string }).id,
    metadata: { scopes: effectiveScopes, expires_at: expiresAt, max_uses: maxUses },
  }).then(() => null, () => null);

  return jsonResponse({
    ok: true,
    token, // shown exactly once — never stored in plaintext
    link: inserted,
    available_scopes: PASSPORT_SCOPES,
  }, 200, corsHeaders);
}));
