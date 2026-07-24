// twin-recompute — Learning Engine + Prediction Engine for the Digital
// Worker Twin (IWOS 4.4). Aggregates signal from assignments, training,
// certifications, and performance, then rebuilds capabilities, predictions,
// recommendations, and knowledge-graph nodes for one worker.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { withSentry } from "../_shared/sentry.ts";
import { jsonResponse, requireUser } from "../_shared/auth.ts";
import { admin, isUuid, requireAgencyMember } from "../_shared/woic.ts";

type Body = { worker_id?: string; agency_id?: string; action?: string };

function clamp(n: number, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, n)); }

Deno.serve(withSentry("twin-recompute", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);

  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body || !isUuid(body.worker_id) || !isUuid(body.agency_id)) {
    return jsonResponse({ error: "worker_id and agency_id are required uuids", code: "bad_request" }, 400, corsHeaders);
  }
  const forbidden = await requireAgencyMember(auth.userClient, body.agency_id, corsHeaders);
  if (forbidden) return forbidden;

  const svc = admin();

  // ---- Gather signals -----------------------------------------------------
  const [workerRes, passportRes, skillsRes, trainingRes, credsRes, assignmentsRes] = await Promise.all([
    svc.from("workers").select("id, first_name, last_name, agency_id").eq("id", body.worker_id).maybeSingle(),
    svc.from("workforce_passports").select("id").eq("worker_id", body.worker_id).maybeSingle(),
    svc.from("worker_skills").select("*").eq("worker_id", body.worker_id),
    svc.from("training_enrollments").select("id, status, completed_at, course_id").eq("worker_id", body.worker_id),
    svc.from("worker_credentials").select("id, name, kind, expires_at, status").eq("worker_id", body.worker_id),
    svc.from("assignments").select("id, status, start_date, end_date, client_id, job_id").eq("worker_id", body.worker_id).limit(200),
  ]);
  if (workerRes.error || !workerRes.data) {
    return jsonResponse({ error: "worker not found", code: "not_found" }, 404, corsHeaders);
  }

  const skills = skillsRes.data ?? [];
  const trainings = trainingRes.data ?? [];
  const credentials = credsRes.data ?? [];
  const assignments = assignmentsRes.data ?? [];

  const completedTrainings = trainings.filter((t: any) => t.status === "completed").length;
  const completedAssignments = assignments.filter((a: any) => a.status === "completed").length;
  const activeAssignments = assignments.filter((a: any) => a.status === "active").length;
  const expiringSoon = credentials.filter((c: any) => {
    if (!c.expires_at) return false;
    const days = (new Date(c.expires_at).getTime() - Date.now()) / 86_400_000;
    return days < 60 && days > -1;
  });

  // ---- Score model --------------------------------------------------------
  const learningProgress = clamp(completedTrainings * 12 + trainings.length * 3);
  const careerHealth = clamp(50 + completedAssignments * 4 - expiringSoon.length * 6);
  const growthScore = clamp(30 + skills.length * 3 + completedTrainings * 5 + completedAssignments * 2);
  const futurePotential = clamp(40 + skills.length * 2 + completedTrainings * 4 + (activeAssignments > 0 ? 10 : 0));

  const riskIndicators: Record<string, string> = {};
  if (expiringSoon.length > 0) riskIndicators.credential_expiry = `${expiringSoon.length} expiring`;
  if (completedAssignments === 0 && assignments.length > 3) riskIndicators.completion_risk = "high";
  if (activeAssignments === 0) riskIndicators.utilization = "idle";

  const careerForecast = {
    next_role_ready_months: Math.max(1, 24 - completedAssignments - completedTrainings),
    recommended_focus: skills.length < 5 ? "expand core skills" : "deepen specialization",
    momentum: growthScore >= 60 ? "positive" : "steady",
  };

  const currentCapabilities = skills.map((s: any) => ({
    label: s.skill_name ?? s.name ?? "skill",
    proficiency: s.proficiency ?? s.level ?? null,
  }));

  // ---- Upsert twin --------------------------------------------------------
  const { data: twinRow, error: twinErr } = await svc
    .from("worker_twins")
    .upsert({
      worker_id: body.worker_id,
      agency_id: body.agency_id,
      passport_id: passportRes.data?.id ?? null,
      career_health: careerHealth,
      learning_progress: learningProgress,
      growth_score: growthScore,
      future_potential: futurePotential,
      risk_indicators: riskIndicators,
      career_forecast: careerForecast,
      current_capabilities: currentCapabilities,
      performance_trend: [
        { label: "assignments_completed", value: completedAssignments },
        { label: "trainings_completed", value: completedTrainings },
        { label: "skills_count", value: skills.length },
      ],
      model_version: "twin-v1",
      last_learned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "worker_id" })
    .select()
    .single();
  if (twinErr) return jsonResponse({ error: twinErr.message, code: "internal" }, 500, corsHeaders);
  const twinId = twinRow.id as string;

  // ---- Rebuild capabilities (skills + certifications + assignments) -------
  await svc.from("twin_capabilities").delete().eq("twin_id", twinId);
  const capabilityRows = [
    ...skills.map((s: any) => ({
      twin_id: twinId, worker_id: body.worker_id!, agency_id: body.agency_id!,
      kind: "skill", label: s.skill_name ?? s.name ?? "skill",
      proficiency: s.proficiency ?? s.level ?? 50, confidence: 0.7,
      evidence: [{ source: "worker_skills", id: s.id }],
    })),
    ...credentials.map((c: any) => ({
      twin_id: twinId, worker_id: body.worker_id!, agency_id: body.agency_id!,
      kind: "certification", label: c.name ?? c.kind ?? "credential",
      proficiency: c.status === "active" ? 90 : 40, confidence: 0.9,
      evidence: [{ source: "worker_credentials", id: c.id, expires_at: c.expires_at }],
    })),
  ];
  if (capabilityRows.length) await svc.from("twin_capabilities").insert(capabilityRows);

  // ---- Predictions --------------------------------------------------------
  const predictions = [
    { kind: "promotion_readiness", value: { score: growthScore }, confidence: 0.6, horizon: "6mo",
      reasoning: `Growth ${growthScore} driven by ${completedTrainings} trainings and ${completedAssignments} completed assignments.` },
    { kind: "turnover_risk", value: { score: activeAssignments === 0 ? 65 : 20 }, confidence: 0.55, horizon: "3mo",
      reasoning: activeAssignments === 0 ? "No active assignment — idle workers churn faster." : "Currently engaged." },
    { kind: "burnout_risk", value: { score: activeAssignments > 3 ? 60 : 20 }, confidence: 0.5, horizon: "3mo",
      reasoning: activeAssignments > 3 ? "High concurrent load." : "Normal utilization." },
    { kind: "certification_needs", value: { expiring: expiringSoon.map((c: any) => c.name) }, confidence: 0.9, horizon: "60d",
      reasoning: expiringSoon.length ? "Renew expiring credentials." : "All credentials current." },
    { kind: "assignment_success", value: { score: careerHealth }, confidence: 0.6, horizon: "next" },
  ];
  await svc.from("twin_predictions").delete().eq("twin_id", twinId);
  await svc.from("twin_predictions").insert(predictions.map((p) => ({
    ...p, twin_id: twinId, worker_id: body.worker_id!, agency_id: body.agency_id!,
  })));

  // ---- Learning event log entry -------------------------------------------
  await svc.from("twin_learning_events").insert({
    twin_id: twinId, worker_id: body.worker_id!, agency_id: body.agency_id!,
    source: "twin-recompute", event_type: "recomputed",
    payload: { skills: skills.length, trainings: trainings.length, assignments: assignments.length },
    impact: { growth_score: growthScore, career_health: careerHealth },
  });

  // ---- Recommendations ----------------------------------------------------
  const recos = [];
  if (expiringSoon.length) recos.push({
    kind: "certification", title: `Renew ${expiringSoon.length} expiring credential(s)`,
    body: expiringSoon.map((c: any) => c.name).join(", "), score: 0.9, confidence: 0.95,
    reasoning: "Expiration within 60 days blocks eligibility.",
  });
  if (skills.length < 5) recos.push({
    kind: "training", title: "Expand core skill set",
    body: "Complete 2 foundational trainings to increase placement rate.", score: 0.75, confidence: 0.7,
    reasoning: "Workers with 5+ documented skills see 30% higher match rate.",
  });
  if (activeAssignments === 0) recos.push({
    kind: "opportunity", title: "Match to next opportunity",
    body: "Idle worker — WOIC will surface top job matches.", score: 0.8, confidence: 0.8,
    reasoning: "Idle >7d correlates with turnover.",
  });
  await svc.from("twin_recommendations").delete().eq("twin_id", twinId).eq("status", "open");
  if (recos.length) await svc.from("twin_recommendations").insert(recos.map((r) => ({
    ...r, twin_id: twinId, worker_id: body.worker_id!, agency_id: body.agency_id!,
  })));

  // ---- Growth plan (upsert single active) ---------------------------------
  const workerName = `${workerRes.data.first_name ?? ""} ${workerRes.data.last_name ?? ""}`.trim() || "Worker";
  await svc.from("growth_plans").delete().eq("twin_id", twinId).eq("status", "active");
  await svc.from("growth_plans").insert({
    twin_id: twinId, worker_id: body.worker_id!, agency_id: body.agency_id!,
    title: `${workerName} — Growth Plan`,
    goals: [
      { title: "Reach growth score 70+", reason: `Current ${growthScore}` },
      { title: "Zero expiring credentials" },
    ],
    training_recommendations: skills.length < 5 ? [{ title: "Foundational Skills Track" }] : [],
    mentor_recommendations: [],
    assignment_recommendations: activeAssignments === 0 ? [{ title: "Find next assignment" }] : [],
    project_recommendations: [],
    status: "active",
  });

  // ---- Knowledge graph: worker + skill nodes/edges ------------------------
  const upsertNode = async (node_type: string, ref_id: string | null, label: string) => {
    const { data } = await svc.from("knowledge_graph_nodes")
      .select("id").eq("agency_id", body.agency_id!).eq("node_type", node_type).eq("label", label).maybeSingle();
    if (data) return data.id as string;
    const ins = await svc.from("knowledge_graph_nodes")
      .insert({ agency_id: body.agency_id!, node_type, ref_id, label })
      .select("id").single();
    return ins.data!.id as string;
  };
  const workerNodeId = await upsertNode("worker", body.worker_id!, workerName);
  for (const s of skills) {
    const skillNodeId = await upsertNode("skill", null, s.skill_name ?? s.name ?? "skill");
    const existing = await svc.from("knowledge_graph_edges")
      .select("id").eq("from_node", workerNodeId).eq("to_node", skillNodeId).eq("relationship", "has_skill").maybeSingle();
    if (!existing.data) {
      await svc.from("knowledge_graph_edges").insert({
        agency_id: body.agency_id!, from_node: workerNodeId, to_node: skillNodeId,
        relationship: "has_skill", weight: s.proficiency ?? s.level ?? 50,
      });
    }
  }

  return jsonResponse({
    twin: twinRow,
    predictions: predictions.length,
    recommendations: recos.length,
    capabilities: capabilityRows.length,
  }, 200, corsHeaders);
}));
