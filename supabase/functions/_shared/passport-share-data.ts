// Compact, verified-only passport payload builder used by share-link views.
// Mirrors passport-api's filtering rules: only verified / non-expired / public rows.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { PassportScope } from "./passport-api.ts";

export async function buildSharedPayload(opts: {
  admin: SupabaseClient;
  passportId: string;
  workerId: string;
  passport: Record<string, unknown>;
  scopes: PassportScope[];
}): Promise<Record<string, unknown>> {
  const { admin, passportId, workerId, passport, scopes } = opts;
  const has = (s: PassportScope) => scopes.includes(s);
  const nowIso = new Date().toISOString();
  const data: Record<string, unknown> = {};
  const jobs: Promise<void>[] = [];

  if (has("identity")) {
    data.identity = {
      display_name: (passport.preferred_name as string) ?? (passport.legal_name as string) ?? null,
      avatar_url: passport.avatar_url ?? null,
      govid_status: passport.govid_status ?? null,
      right_to_work_status: passport.right_to_work_status ?? null,
      identity_verification_status: passport.identity_verification_status ?? null,
      languages: passport.languages ?? [],
      scores: {
        completion: passport.completion_score,
        compliance: passport.compliance_score,
        skill: passport.skill_score,
        reputation: passport.reputation_score,
        career: passport.career_score,
      },
      updated_at: passport.updated_at,
    };
  }

  if (has("availability")) {
    data.availability = {
      status: passport.availability_status ?? null,
      public_profile: passport.public_profile ?? false,
    };
  }

  if (has("verifications")) jobs.push((async () => {
    const { data: rows } = await admin.from("passport_verifications")
      .select("id, verification_type, status, verified_at, expires_at")
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
      .select("id, name, issuer, status, issued_on, expires_on")
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
      admin.from("training_enrollments").select("id, course_id, status, completed_at")
        .eq("worker_id", workerId).eq("status", "completed"),
      admin.from("training_certificates").select("id, course_id, issued_at, expires_at, certificate_number")
        .eq("worker_id", workerId),
    ]);
    data.training = { completed_courses: enroll.data ?? [], certificates: certs.data ?? [] };
  })());

  if (has("badges")) jobs.push((async () => {
    const { data: rows } = await admin.from("passport_badges")
      .select("id, badge_key, name, tier, awarded_at").eq("passport_id", passportId);
    data.badges = rows ?? [];
  })());

  if (has("reputation")) jobs.push((async () => {
    const { data: rows } = await admin.from("passport_reputation")
      .select("category, score, sample_size, disputed, last_computed_at").eq("passport_id", passportId);
    data.reputation = {
      overall: (passport.reputation_score as number | null) ?? null,
      categories: (rows ?? []).filter((r: { disputed: boolean | null }) => !r.disputed),
    };
  })());

  if (has("portfolio")) jobs.push((async () => {
    const { data: rows } = await admin.from("passport_portfolios")
      .select("id, kind, title, description, external_url, order_index")
      .eq("passport_id", passportId).eq("is_public", true).order("order_index", { ascending: true });
    data.portfolio = rows ?? [];
  })());

  if (has("work_history")) jobs.push((async () => {
    const { data: rows } = await admin.from("assignments")
      .select("id, status, starts_on, ends_on").eq("worker_id", workerId)
      .order("starts_on", { ascending: false }).limit(100);
    const completed = (rows ?? []).filter((r: { status: string }) => ["completed", "closed", "ended"].includes(r.status));
    data.work_history = { total_assignments: (rows ?? []).length, completed: completed.length, assignments: completed };
  })());

  await Promise.all(jobs);
  return data;
}
