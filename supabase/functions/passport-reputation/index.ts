// Passport reputation scoring — computes attendance, reliability, performance,
// safety, professionalism, client feedback and completion signals for a passport.
// Writes are service-role only (passport_reputation is write-locked for users).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { jsonResponse, requireUser } from "../_shared/auth.ts";
import { withSentry } from "../_shared/sentry.ts";

export default {};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Weight of each category in the blended reputation score. */
const WEIGHTS: Record<string, number> = {
  attendance: 0.2,
  reliability: 0.2,
  performance: 0.15,
  safety: 0.15,
  professionalism: 0.1,
  client_feedback: 0.1,
  completion: 0.1,
};

type Signal = {
  category: string;
  score: number; // 0-5
  sample_size: number;
  source: string;
  metadata: Record<string, unknown>;
};

const clamp5 = (n: number) => Math.max(0, Math.min(5, Number(n.toFixed(2))));
const ratio5 = (num: number, den: number, fallback = 0) =>
  den > 0 ? clamp5((num / den) * 5) : fallback;

Deno.serve(withSentry("passport-reputation", async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;
  const { userClient } = auth;

  let body: { passport_id?: string };
  try { body = await req.json(); } catch { body = {}; }
  const passportId = body.passport_id;
  if (!passportId || !UUID_RE.test(passportId)) {
    return jsonResponse({ error: "passport_id required", code: "bad_request" }, 400, corsHeaders);
  }

  // RLS gate: caller must be able to read the passport.
  const { data: passport, error: pe } = await userClient
    .from("workforce_passports").select("id, worker_id, agency_id").eq("id", passportId).maybeSingle();
  if (pe || !passport) return jsonResponse({ error: "not_found", code: "not_found" }, 404, corsHeaders);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const workerId = (passport as any).worker_id as string;
  const agencyId = (passport as any).agency_id as string | null;

  const [timeTickets, tickets, assignments, corrections, compliance, credentials, training, onboarding, skills, docs] =
    await Promise.all([
      admin.from("tto_time_tickets")
        .select("id, status, work_date, scheduled_start, scheduled_end, actual_start, actual_end, regular_hours, overtime_hours, anomalies, submitted_at, approved_at")
        .eq("worker_id", workerId).order("work_date", { ascending: false }).limit(500),
      admin.from("tickets")
        .select("id, status, signed_at, rejected_at, rejection_reason, total_hours, hard_hat_required, boots_required, gloves_required, glasses_required, vest_required")
        .eq("worker_id", workerId).order("created_at", { ascending: false }).limit(500),
      admin.from("assignments").select("id, status, starts_on, ends_on").eq("worker_id", workerId).limit(500),
      admin.from("tto_ticket_corrections").select("id, status, time_ticket_id").limit(500),
      admin.from("passport_compliance").select("status, requirement_type, expires_at").eq("passport_id", passportId),
      admin.from("worker_credentials").select("id, status, expires_on").eq("worker_id", workerId),
      admin.from("training_enrollments").select("id, status, progress_pct").eq("worker_id", workerId),
      admin.from("onboarding_sessions").select("id, status, progress_pct, completed_at").eq("worker_id", workerId),
      admin.from("worker_skills").select("id").eq("worker_id", workerId),
      admin.from("worker_documents").select("id").eq("worker_id", workerId),
    ]);

  const tt = timeTickets.data ?? [];
  const tk = tickets.data ?? [];
  const asg = assignments.data ?? [];
  const now = Date.now();

  const signals: Signal[] = [];

  // 1. ATTENDANCE — shifts worked vs no-shows, and punctuality against schedule.
  {
    const worked = tt.filter((t: any) => t.actual_start);
    const noShow = tt.filter((t: any) => !t.actual_start && new Date(t.work_date).getTime() < now);
    const onTime = worked.filter((t: any) => {
      if (!t.scheduled_start) return true;
      const late = new Date(t.actual_start).getTime() - new Date(t.scheduled_start).getTime();
      return late <= 5 * 60 * 1000;
    });
    const total = worked.length + noShow.length;
    const showRate = total ? worked.length / total : 0;
    const punctuality = worked.length ? onTime.length / worked.length : 0;
    signals.push({
      category: "attendance",
      score: total ? clamp5((showRate * 0.6 + punctuality * 0.4) * 5) : 0,
      sample_size: total,
      source: "tto_time_tickets",
      metadata: { shifts_worked: worked.length, no_shows: noShow.length, on_time: onTime.length },
    });
  }

  // 2. RELIABILITY — assignments completed vs cancelled/abandoned + shift completion.
  {
    const completed = asg.filter((a: any) => ["completed", "closed", "filled"].includes(String(a.status))).length;
    const dropped = asg.filter((a: any) => ["cancelled", "terminated", "abandoned", "no_show"].includes(String(a.status))).length;
    const finishedShifts = tt.filter((t: any) => t.actual_start && t.actual_end).length;
    const startedShifts = tt.filter((t: any) => t.actual_start).length;
    const asgTotal = completed + dropped;
    const asgRate = asgTotal ? completed / asgTotal : 0;
    const shiftRate = startedShifts ? finishedShifts / startedShifts : 0;
    const sample = asgTotal + startedShifts;
    signals.push({
      category: "reliability",
      score: sample ? clamp5((asgRate * 0.5 + shiftRate * 0.5) * 5) : 0,
      sample_size: sample,
      source: "assignments+tto_time_tickets",
      metadata: { assignments_completed: completed, assignments_dropped: dropped, shifts_finished: finishedShifts },
    });
  }

  // 3. PERFORMANCE — approved time tickets, anomaly rate, correction requests.
  {
    const approved = tt.filter((t: any) => t.approved_at || t.status === "approved").length;
    const submitted = tt.filter((t: any) => t.submitted_at || t.approved_at).length;
    const anomalies = tt.reduce((a: number, t: any) => a + (Array.isArray(t.anomalies) ? t.anomalies.length : 0), 0);
    const ttIds = new Set(tt.map((t: any) => t.id));
    const corr = (corrections.data ?? []).filter((c: any) => ttIds.has(c.time_ticket_id)).length;
    const approvalRate = submitted ? approved / submitted : 0;
    const cleanRate = submitted ? Math.max(0, 1 - (anomalies + corr) / submitted) : 0;
    signals.push({
      category: "performance",
      score: submitted ? clamp5((approvalRate * 0.6 + cleanRate * 0.4) * 5) : 0,
      sample_size: submitted,
      source: "tto_time_tickets",
      metadata: { approved, submitted, anomalies, corrections: corr },
    });
  }

  // 4. SAFETY — safety compliance items current + PPE-required assignments completed safely.
  {
    const safetyItems = (compliance.data ?? []).filter((c: any) =>
      /safety|ppe|osha|incident|drug|medical/i.test(String(c.requirement_type ?? "") + String(c.status ?? "")));
    const validSafety = safetyItems.filter((c: any) =>
      c.status === "complete" && (!c.expires_at || new Date(c.expires_at).getTime() > now)).length;
    const validCreds = (credentials.data ?? []).filter((c: any) =>
      c.status !== "revoked" && (!c.expires_on || new Date(c.expires_on).getTime() > now)).length;
    const totalCreds = (credentials.data ?? []).length;
    const safetyRate = safetyItems.length ? validSafety / safetyItems.length : (totalCreds ? validCreds / totalCreds : 0);
    const sample = safetyItems.length + totalCreds;
    signals.push({
      category: "safety",
      score: sample ? clamp5(safetyRate * 5) : 0,
      sample_size: sample,
      source: "passport_compliance+worker_credentials",
      metadata: { safety_items: safetyItems.length, safety_current: validSafety, credentials_valid: validCreds },
    });
  }

  // 5. PROFESSIONALISM — ticket rejections and dispute-free record.
  {
    const closed = tk.filter((t: any) => ["signed", "closed", "rejected", "corrected"].includes(String(t.status)));
    const rejected = tk.filter((t: any) => t.rejected_at || t.status === "rejected").length;
    const corrected = tk.filter((t: any) => t.status === "corrected").length;
    const rate = closed.length ? Math.max(0, 1 - (rejected + corrected * 0.5) / closed.length) : 0;
    signals.push({
      category: "professionalism",
      score: closed.length ? clamp5(rate * 5) : 0,
      sample_size: closed.length,
      source: "tickets",
      metadata: { tickets_closed: closed.length, rejected, corrected },
    });
  }

  // 6. CLIENT FEEDBACK — client-signed approval rate on labor tickets.
  {
    const reviewed = tk.filter((t: any) => t.signed_at || t.rejected_at);
    const signed = reviewed.filter((t: any) => t.signed_at && !t.rejected_at).length;
    signals.push({
      category: "client_feedback",
      score: ratio5(signed, reviewed.length),
      sample_size: reviewed.length,
      source: "tickets",
      metadata: { signed, reviewed: reviewed.length },
    });
  }

  // 7. COMPLETION — onboarding, training and profile completeness.
  {
    const ob = (onboarding.data ?? []);
    const obPct = ob.length
      ? Math.max(...ob.map((o: any) => (o.completed_at ? 100 : Number(o.progress_pct ?? 0))))
      : 0;
    const tr = training.data ?? [];
    const trDone = tr.filter((t: any) => String(t.status) === "completed").length;
    const trPct = tr.length ? (trDone / tr.length) * 100 : 0;
    const profileBits = [
      (skills.data?.length ?? 0) > 0,
      (docs.data?.length ?? 0) > 0,
      (credentials.data?.length ?? 0) > 0,
    ].filter(Boolean).length;
    const profilePct = (profileBits / 3) * 100;
    const overall = obPct * 0.4 + trPct * 0.3 + profilePct * 0.3;
    signals.push({
      category: "completion",
      score: clamp5((overall / 100) * 5),
      sample_size: ob.length + tr.length + profileBits,
      source: "onboarding_sessions+training_enrollments+profile",
      metadata: { onboarding_pct: obPct, training_pct: Math.round(trPct), profile_pct: Math.round(profilePct) },
    });
  }

  // Persist each category (service role only) — preserve dispute flags.
  const { data: existing } = await admin.from("passport_reputation")
    .select("category, disputed, dispute_reason").eq("passport_id", passportId);
  const disputedMap = new Map((existing ?? []).map((r: any) => [r.category, r]));

  const rows = signals.map((s) => ({
    passport_id: passportId,
    agency_id: agencyId,
    category: s.category,
    score: s.score,
    sample_size: s.sample_size,
    source: s.source,
    metadata: s.metadata,
    disputed: disputedMap.get(s.category)?.disputed ?? false,
    dispute_reason: disputedMap.get(s.category)?.dispute_reason ?? null,
    last_computed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const { error: ue } = await admin.from("passport_reputation")
    .upsert(rows, { onConflict: "passport_id,category" });
  if (ue) return jsonResponse({ error: ue.message, code: "server_error" }, 500, corsHeaders);

  // Blended reputation score (0-5). Disputed categories are excluded.
  let wSum = 0;
  let acc = 0;
  for (const s of signals) {
    if (disputedMap.get(s.category)?.disputed) continue;
    const w = WEIGHTS[s.category] ?? 0;
    acc += s.score * w;
    wSum += w;
  }
  const overallScore = wSum ? Number((acc / wSum).toFixed(2)) : 0;

  await admin.from("workforce_passports")
    .update({ reputation_score: overallScore }).eq("id", passportId);

  await admin.from("passport_timeline").insert({
    passport_id: passportId,
    event_type: "reputation_computed",
    title: "Reputation score recomputed",
    description: `Overall ${overallScore}/5 across ${signals.length} categories`,
    metadata: { categories: signals.map((s) => ({ category: s.category, score: s.score })) },
  });

  return jsonResponse({ ok: true, overall_score: overallScore, categories: signals }, 200, corsHeaders);
}));
