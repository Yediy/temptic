// Public consumption of a temporary passport share link.
// No JWT required — the token IS the credential. Every request is validated and
// logged server-side BEFORE any passport data is fetched or returned.
//
// POST { token }
// Enforced: revocation, expiration, max_uses (one-time by default), scope limits.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { jsonResponse } from "../_shared/auth.ts";
import { withSentry } from "../_shared/sentry.ts";
import { isScope, sha256Hex, type PassportScope } from "../_shared/passport-api.ts";
import { buildSharedPayload } from "../_shared/passport-share-data.ts";

export default {};

const TOKEN_RE = /^[0-9a-f]{32,128}$/i;

Deno.serve(withSentry("passport-share-view", async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let body: { token?: unknown };
  try { body = await req.json(); } catch { body = {}; }
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!TOKEN_RE.test(token)) {
    return jsonResponse({ error: "This share link is not valid.", code: "invalid_token" }, 401, corsHeaders);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  const userAgent = (req.headers.get("user-agent") ?? "").slice(0, 300) || null;

  const tokenHash = await sha256Hex(token);
  const { data: link } = await admin
    .from("passport_sharing")
    .select("id, passport_id, scopes, expires_at, revoked_at, max_uses, used_count, one_time, view_count, label")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  const deny = async (reason: string, passportId: string | null) => {
    if (passportId) {
      await admin.from("passport_access_log").insert({
        passport_id: passportId,
        actor_id: null,
        actor_type: "share_token",
        action: "share_view_denied",
        resource: reason,
        ip_address: ip,
        user_agent: userAgent,
        metadata: { reason },
      }).then(() => null, () => null);
    }
    return jsonResponse(
      { error: "This share link is no longer valid.", code: "share_link_invalid", reason },
      403,
      corsHeaders,
    );
  };

  if (!link) {
    // Uniform response so an attacker cannot distinguish unknown vs revoked.
    return jsonResponse(
      { error: "This share link is no longer valid.", code: "share_link_invalid", reason: "not_found" },
      403,
      corsHeaders,
    );
  }

  const l = link as {
    id: string; passport_id: string; scopes: string[] | null; expires_at: string | null;
    revoked_at: string | null; max_uses: number; used_count: number; one_time: boolean;
    view_count: number; label: string | null;
  };

  if (l.revoked_at) return await deny("revoked", l.passport_id);
  if (l.expires_at && new Date(l.expires_at).getTime() <= Date.now()) return await deny("expired", l.passport_id);
  if (l.used_count >= l.max_uses) return await deny("exhausted", l.passport_id);

  const nowIso = new Date().toISOString();
  const usedCount = l.used_count + 1;
  const exhausted = usedCount >= l.max_uses;

  // Atomically consume the use before returning data. If another request
  // consumed the last use concurrently, the guarded update matches no row.
  const { data: consumed } = await admin
    .from("passport_sharing")
    .update({
      used_count: usedCount,
      view_count: l.view_count + 1,
      last_viewed_at: nowIso,
      last_viewed_ip: ip,
      last_viewed_user_agent: userAgent,
      revoked_at: exhausted ? nowIso : null,
      revoked_reason: exhausted ? "single_use_consumed" : null,
      updated_at: nowIso,
    })
    .eq("id", l.id)
    .eq("used_count", l.used_count)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (!consumed) return await deny("exhausted", l.passport_id);

  const scopes = (l.scopes ?? []).filter(isScope) as PassportScope[];

  // Log the access before any passport data is read or returned.
  await admin.from("passport_access_log").insert({
    passport_id: l.passport_id,
    actor_id: null,
    actor_type: "share_token",
    action: "share_view",
    resource: l.id,
    ip_address: ip,
    user_agent: userAgent,
    metadata: { scopes, use: usedCount, max_uses: l.max_uses, label: l.label },
  }).then(() => null, () => null);

  if (!scopes.length) {
    return jsonResponse({ error: "This share link grants no readable data.", code: "forbidden" }, 403, corsHeaders);
  }

  const { data: passport } = await admin
    .from("workforce_passports")
    .select("id, worker_id, legal_name, preferred_name, avatar_url, govid_status, right_to_work_status, identity_verification_status, languages, completion_score, compliance_score, skill_score, reputation_score, career_score, availability_status, public_profile, updated_at")
    .eq("id", l.passport_id).maybeSingle();
  if (!passport) return jsonResponse({ error: "not_found", code: "not_found" }, 404, corsHeaders);

  const workerId = (passport as { worker_id: string }).worker_id;
  const { data: worker } = await admin
    .from("workers").select("agency_id").eq("id", workerId).maybeSingle();

  const data = await buildSharedPayload({
    admin,
    passportId: l.passport_id,
    workerId,
    passport: passport as Record<string, unknown>,
    scopes,
  });

  await admin.from("ttos_events").insert({
    agency_id: (worker as { agency_id: string | null } | null)?.agency_id ?? null,
    kind: "passport.share.viewed",
    payload: { passport_id: l.passport_id, link_id: l.id, scopes, use: usedCount, one_time: l.one_time },
  }).then(() => null, () => null);

  return jsonResponse({
    version: "1.0",
    passport_id: l.passport_id,
    label: l.label,
    access: {
      via: "share_token",
      scopes,
      use: usedCount,
      max_uses: l.max_uses,
      one_time: l.one_time,
      expires_at: l.expires_at,
      consumed: exhausted,
    },
    verified_only: true,
    generated_at: nowIso,
    data,
  }, 200, corsHeaders);
}));
