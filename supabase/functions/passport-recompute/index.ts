// Recompute passport completion, compliance, skill, reputation scores.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, jsonResponse, requireUser } from "../_shared/auth.ts";
import { withSentry } from "../_shared/sentry.ts";

export default {};

Deno.serve(withSentry("passport-recompute", async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const gate = await requireUser(req);
  if (!gate.ok) return gate.response;
  const { user, userClient } = gate;

  let body: { passport_id?: string };
  try { body = await req.json(); } catch { body = {}; }
  const passportId = body.passport_id;
  if (!passportId) return jsonResponse({ error: "passport_id required", code: "bad_request" }, 400, corsHeaders);

  // Verify caller can read the passport (RLS-gated).
  const { data: passport, error: pe } = await userClient
    .from("workforce_passports").select("*, workers!inner(id, user_id, first_name, last_name)")
    .eq("id", passportId).maybeSingle();
  if (pe || !passport) return jsonResponse({ error: "not_found", code: "not_found" }, 404, corsHeaders);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const workerId = (passport as any).workers.id;

  // Pull signals in parallel.
  const [skills, creds, docs, empl, comp, rep, verif] = await Promise.all([
    admin.from("worker_skills").select("id, level").eq("worker_id", workerId),
    admin.from("worker_credentials").select("id, expires_on").eq("worker_id", workerId),
    admin.from("worker_documents").select("id").eq("worker_id", workerId),
    admin.from("employment_history").select("id").eq("worker_id", workerId),
    admin.from("passport_compliance").select("status").eq("passport_id", passportId),
    admin.from("passport_reputation").select("score, sample_size").eq("passport_id", passportId),
    admin.from("identity_verifications").select("status").eq("passport_id", passportId),
  ]);

  const now = Date.now();
  const validCreds = (creds.data ?? []).filter((c: any) => !c.expires_on || new Date(c.expires_on).getTime() > now);

  // Completion: 6 signals, 100 total.
  let completion = 0;
  if ((passport as any).legal_name) completion += 15;
  if ((skills.data?.length ?? 0) >= 3) completion += 20;
  if ((empl.data?.length ?? 0) >= 1) completion += 15;
  if ((docs.data?.length ?? 0) >= 1) completion += 15;
  if (validCreds.length >= 1) completion += 15;
  if ((verif.data ?? []).some((v: any) => v.status === "verified")) completion += 20;

  // Skill score: mean of numeric levels (0-100 scale approx).
  const levelMap: Record<string, number> = { beginner: 25, novice: 25, intermediate: 55, advanced: 80, expert: 100 };
  const levels = (skills.data ?? []).map((s: any) =>
    typeof s.level === "number" ? Math.max(0, Math.min(100, s.level)) : (levelMap[String(s.level ?? "").toLowerCase()] ?? 40)
  );
  const skillScore = levels.length ? Math.round(levels.reduce((a: number, b: number) => a + b, 0) / levels.length) : 0;

  // Compliance score: % of items complete.
  const compRows = comp.data ?? [];
  const complete = compRows.filter((c: any) => c.status === "complete").length;
  const complianceScore = compRows.length ? Math.round((complete / compRows.length) * 100) : 0;

  // Reputation: weighted mean of categories.
  const repRows = rep.data ?? [];
  const totalWeight = repRows.reduce((a: number, r: any) => a + (r.sample_size || 1), 0);
  const weighted = repRows.reduce((a: number, r: any) => a + Number(r.score) * (r.sample_size || 1), 0);
  const reputation = totalWeight ? Number((weighted / totalWeight).toFixed(2)) : 0;

  // Career score: blend.
  const career = Number(((completion * 0.25) + (skillScore * 0.35) + (complianceScore * 0.2) + (reputation * 20 * 0.2)).toFixed(2));

  const identityVerified = (verif.data ?? []).some((v: any) => v.status === "verified") ? "verified" : "unverified";

  const { error: ue } = await admin.from("workforce_passports").update({
    completion_score: completion,
    skill_score: skillScore,
    compliance_score: complianceScore,
    reputation_score: reputation,
    career_score: career,
    identity_verification_status: identityVerified,
  }).eq("id", passportId);
  if (ue) return jsonResponse({ error: ue.message, code: "server_error" }, 500, corsHeaders);

  // Timeline entry.
  await admin.from("passport_timeline").insert({
    passport_id: passportId,
    event_type: "score_recomputed",
    title: "Passport scores recomputed",
    description: `Completion ${completion}, Skills ${skillScore}, Compliance ${complianceScore}, Reputation ${reputation}, Career ${career}`,
  });

  return jsonResponse({
    ok: true,
    completion_score: completion,
    skill_score: skillScore,
    compliance_score: complianceScore,
    reputation_score: reputation,
    career_score: career,
  }, 200, corsHeaders);
}));
