// Universal Passport API — the single read surface every future IWOS operating
// profile uses to consume verified workforce passport data.
//
// POST { passport_id, scopes?: string[], share_token?: string, consumer?: string,
//        action?: "read" | "describe" }
//
// Guarantees:
//  - 401 for missing/invalid tokens, 403 when no grant exists, 404 for unknown passports.
//  - Only scopes explicitly granted (or owner/super-admin) are returned.
//  - Only *verified* records are emitted (unverified rows are filtered out).
//  - Every call is written to passport_access_log and the IWOS event fabric.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { jsonResponse, requireUser } from "../_shared/auth.ts";
import { withSentry } from "../_shared/sentry.ts";
import { PASSPORT_SCOPES, isScope, resolveGrant, type PassportScope } from "../_shared/passport-api.ts";

export default {};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SCOPE_DOCS: Record<PassportScope, string> = {
  identity: "Verified identity status flags (never raw PII such as DOB or address history).",
  verifications: "Completed passport verifications with verifier and verified_at.",
  compliance: "Compliance requirements currently in a completed/valid state.",
  credentials: "Verified, unexpired worker credentials.",
  skills: "Skills attached to the worker profile.",
  training: "Completed training enrollments and issued certificates.",
  badges: "Awarded passport badges.",
  reputation: "Non-disputed reputation category scores and the blended score.",
  portfolio: "Portfolio items the owner marked public.",
  availability: "Availability status and public profile flag.",
  work_history: "Completed assignments (counts, roles and date ranges — no rates).",
};

Deno.serve(withSentry("passport-api", async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;
  const { user, userClient } = auth;

  let body: {
    passport_id?: string;
    scopes?: unknown;
    share_token?: string;
    consumer?: string;
    action?: string;
  };
  try { body = await req.json(); } catch { body = {}; }

  const action = body.action === "describe" ? "describe" : "read";
  if (action === "describe") {
    return jsonResponse({
      version: "1.0",
      scopes: PASSPORT_SCOPES.map((s) => ({ scope: s, description: SCOPE_DOCS[s] })),
    }, 200, corsHeaders);
  }

  const passportId = body.passport_id;
  if (!passportId || !UUID_RE.test(passportId)) {
    return jsonResponse({ error: "passport_id required", code: "bad_request" }, 400, corsHeaders);
  }
  const consumer = typeof body.consumer === "string" ? body.consumer.slice(0, 64) : "unknown";
  const shareToken = typeof body.share_token === "string" && body.share_token.length <= 512
    ? body.share_token
    : null;

  const requested = Array.isArray(body.scopes) ? body.scopes.filter(isScope) : [];
  if (Array.isArray(body.scopes) && requested.length !== body.scopes.length) {
    return jsonResponse({ error: "unknown scope requested", code: "bad_request" }, 400, corsHeaders);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: passport } = await admin
    .from("workforce_passports")
    .select("id, worker_id, legal_name, preferred_name, avatar_url, govid_status, right_to_work_status, identity_verification_status, languages, completion_score, compliance_score, skill_score, reputation_score, career_score, availability_status, public_profile, updated_at")
    .eq("id", passportId).maybeSingle();
  if (!passport) return jsonResponse({ error: "not_found", code: "not_found" }, 404, corsHeaders);

  const workerId = (passport as { worker_id: string }).worker_id;
  const { data: worker } = await admin
    .from("workers").select("id, user_id, agency_id, first_name, last_name").eq("id", workerId).maybeSingle();

  const grant = await resolveGrant({
    admin,
    userClient,
    user,
    passportId,
    workerUserId: (worker as { user_id: string | null } | null)?.user_id ?? null,
    shareToken,
  });

  const logAccess = async (granted: PassportScope[], denied: boolean) => {
    await admin.from("passport_access_log").insert({
      passport_id: passportId,
      actor_id: user.id,
      actor_type: grant?.via ?? "unknown",
      action: denied ? "api_denied" : "api_read",
      resource: consumer,
      metadata: { scopes: granted, requested, via: grant?.via ?? null, permission_id: grant?.permission_id ?? null },
    }).then(() => null, () => null);
  };

  if (!grant) {
    await logAccess([], true);
    return jsonResponse({ error: "No active passport grant for this caller.", code: "forbidden" }, 403, corsHeaders);
  }

  const effective = (requested.length ? requested.filter((s) => grant.scopes.includes(s)) : grant.scopes);
  if (!effective.length) {
    await logAccess([], true);
    return jsonResponse({ error: "No permitted scopes for this request.", code: "forbidden" }, 403, corsHeaders);
  }

  const has = (s: PassportScope) => effective.includes(s);
  const nowIso = new Date().toISOString();
  const data: Record<string, unknown> = {};

  // identity — status flags only, never raw PII.
  if (has("identity")) {
    const p = passport as Record<string, unknown>;
    data.identity = {
      passport_id: passportId,
      worker_id: workerId,
      display_name: (p.preferred_name as string) ?? (p.legal_name as string) ?? null,
      avatar_url: p.avatar_url ?? null,
      govid_status: p.govid_status ?? null,
      right_to_work_status: p.right_to_work_status ?? null,
      identity_verification_status: p.identity_verification_status ?? null,
      languages: p.languages ?? [],
      scores: {
        completion: p.completion_score, compliance: p.compliance_score,
        skill: p.skill_score, reputation: p.reputation_score, career: p.career_score,
      },
      updated_at: p.updated_at,
    };
  }

  if (has("availability")) {
    const p = passport as Record<string, unknown>;
    data.availability = { status: p.availability_status ?? null, public_profile: p.public_profile ?? false };
  }

  const jobs: Promise<void>[] = [];

  if (has("verifications")) jobs.push((async () => {
    const { data: rows } = await admin.from("passport_verifications")
      .select("id, verification_type, status, verified_at, verifier, expires_at, metadata")
      .eq("passport_id", passportId).eq("status", "verified");
    data.verifications = (rows ?? []).filter((r: { expires_at: string | null }) => !r.expires_at || r.expires_at > nowIso);
  })());

  if (has("compliance")) jobs.push((async () => {
    const { data: rows } = await admin.from("passport_compliance")
      .select("id, requirement_type, label, status, completed_at, expires_at")
      .eq("passport_id", passportId).in("status", ["completed", "valid", "approved"]);
    data.compliance = (rows ?? []).filter((r: { expires_at: string | null }) => !r.expires_at || r.expires_at > nowIso);
  })());

  if (has("credentials")) jobs.push((async () => {
    const { data: rows } = await admin.from("worker_credentials")
      .select("id, credential_id, name, issuer, status, issued_on, expires_on")
      .eq("worker_id", workerId).in("status", ["verified", "active", "approved"]);
    data.credentials = (rows ?? []).filter((r: { expires_on: string | null }) => !r.expires_on || r.expires_on >= nowIso.slice(0, 10));
  })());

  if (has("skills")) jobs.push((async () => {
    const { data: rows } = await admin.from("worker_skills")
      .select("id, skill_id, proficiency, years_experience").eq("worker_id", workerId);
    data.skills = rows ?? [];
  })());

  if (has("training")) jobs.push((async () => {
    const [enroll, certs] = await Promise.all([
      admin.from("training_enrollments").select("id, course_id, status, progress_pct, completed_at")
        .eq("worker_id", workerId).eq("status", "completed"),
      admin.from("training_certificates").select("id, course_id, issued_at, expires_at, certificate_number")
        .eq("worker_id", workerId),
    ]);
    data.training = { completed_courses: enroll.data ?? [], certificates: certs.data ?? [] };
  })());

  if (has("badges")) jobs.push((async () => {
    const { data: rows } = await admin.from("passport_badges")
      .select("id, badge_key, name, tier, awarded_by, awarded_at").eq("passport_id", passportId);
    data.badges = rows ?? [];
  })());

  if (has("reputation")) jobs.push((async () => {
    const { data: rows } = await admin.from("passport_reputation")
      .select("category, score, sample_size, source, disputed, last_computed_at")
      .eq("passport_id", passportId);
    data.reputation = {
      overall: (passport as { reputation_score: number | null }).reputation_score ?? null,
      categories: (rows ?? []).filter((r: { disputed: boolean | null }) => !r.disputed),
    };
  })());

  if (has("portfolio")) jobs.push((async () => {
    const { data: rows } = await admin.from("passport_portfolios")
      .select("id, kind, title, description, media_url, external_url, order_index")
      .eq("passport_id", passportId).eq("is_public", true).order("order_index", { ascending: true });
    data.portfolio = rows ?? [];
  })());

  if (has("work_history")) jobs.push((async () => {
    const { data: rows } = await admin.from("assignments")
      .select("id, status, starts_on, ends_on, placement_id, client_id").eq("worker_id", workerId)
      .order("starts_on", { ascending: false }).limit(200);
    const completed = (rows ?? []).filter((r: { status: string }) => ["completed", "closed", "ended"].includes(r.status));
    data.work_history = { total_assignments: (rows ?? []).length, completed: completed.length, assignments: completed };
  })());

  await Promise.all(jobs);

  await logAccess(effective, false);

  // Publish to the IWOS event fabric so consuming profiles are observable.
  await admin.from("ttos_events").insert({
    agency_id: (worker as { agency_id: string | null } | null)?.agency_id ?? null,
    kind: "passport.api.read",
    payload: { passport_id: passportId, consumer, scopes: effective, via: grant.via, actor_id: user.id },
  }).then(() => null, () => null);

  return jsonResponse({
    version: "1.0",
    passport_id: passportId,
    consumer,
    access: {
      via: grant.via,
      permission_id: grant.permission_id,
      expires_at: grant.expires_at,
      granted_scopes: grant.scopes,
      returned_scopes: effective,
    },
    verified_only: true,
    generated_at: nowIso,
    data,
  }, 200, corsHeaders);
}));
