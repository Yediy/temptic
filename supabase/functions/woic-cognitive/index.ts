// woic-cognitive — the single cognitive API for the entire IWOS platform.
//
// POST { agency_id, operation, params }
//
// Operations (the WOIC unified API surface):
//   reason               Reason()               multi-step, evidence-backed reasoning
//   predict              Predict()              transparent probabilistic prediction
//   recommend            Recommend()            ranked, explainable recommendations
//   explain              Explain()              explanation of a stored artifact
//   learn                Learn()                record outcome/feedback, update org memory
//   retrieve_knowledge   RetrieveKnowledge()    semantic memory + article retrieval
//   store_knowledge      StoreKnowledge()       write to long-term memory + graph
//   evaluate_compliance  EvaluateCompliance()   compliance reasoning + verdict
//   generate_report      GenerateReport()       executive briefs
//   generate_communication GenerateCommunication() tone/language aware messaging
//   simulate             Simulate()             scenario simulation
//   security_scan        SecurityIntelligence   anomaly detection over platform activity
//   snapshot             Operational context snapshot (no model call)
//
// Every operation is tenant-scoped (agency membership enforced), audited into
// woic_cognitive_requests, and cached where safe.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { withSentry } from "../_shared/sentry.ts";
import { jsonResponse, requireUser } from "../_shared/auth.ts";
import { admin, isUuid, requireAgencyMember } from "../_shared/woic.ts";
import {
  cacheGet,
  cacheKey,
  cacheSet,
  cognitiveJson,
  cognitiveText,
  COGNITIVE_MODEL,
  GatewayError,
  logCognitiveRequest,
  retrieveKnowledgeArticles,
  retrieveMemory,
  storeMemory,
  upsertGraphEdge,
  upsertGraphEntity,
} from "../_shared/woic-cognitive.ts";
import { buildOrgSnapshot, loadOrgPreferences } from "../_shared/woic-context.ts";

type Params = Record<string, unknown>;

const str = (v: unknown, max = 4000) => (typeof v === "string" ? v.slice(0, max) : "");
const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const clampScore = (v: unknown) => Math.max(0, Math.min(1, num(v, 0.5)));

const OPERATIONS = new Set([
  "reason", "predict", "recommend", "explain", "learn",
  "retrieve_knowledge", "store_knowledge", "evaluate_compliance",
  "generate_report", "generate_communication", "simulate",
  "security_scan", "snapshot",
]);

Deno.serve(withSentry("woic-cognitive", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);

  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;
  const { user, userClient } = auth;

  const raw = await req.text();
  if (raw.length > 512_000) {
    return jsonResponse({ error: "Payload too large.", code: "payload_too_large" }, 413, corsHeaders);
  }
  let body: { agency_id?: string; operation?: string; params?: Params } | null = null;
  try {
    body = JSON.parse(raw);
  } catch {
    return jsonResponse({ error: "Invalid JSON body.", code: "bad_request" }, 400, corsHeaders);
  }

  const agencyId = body?.agency_id;
  const operation = str(body?.operation, 64);
  const p: Params = (body?.params ?? {}) as Params;

  if (!isUuid(agencyId)) {
    return jsonResponse({ error: "agency_id must be a uuid", code: "bad_request" }, 400, corsHeaders);
  }
  if (!OPERATIONS.has(operation)) {
    return jsonResponse({ error: `unknown operation: ${operation}`, code: "not_found" }, 404, corsHeaders);
  }
  const forbidden = await requireAgencyMember(userClient, agencyId, corsHeaders);
  if (forbidden) return forbidden;

  const db = admin();
  const started = Date.now();

  try {
    const result = await dispatch(operation, db, agencyId, user.id, p);
    await logCognitiveRequest({
      agency_id: agencyId,
      user_id: user.id,
      service: serviceOf(operation),
      operation,
      input: p,
      output: result,
      latency_ms: Date.now() - started,
      cached: Boolean((result as { cached?: boolean })?.cached),
      model: COGNITIVE_MODEL,
    });
    return jsonResponse({ data: result }, 200, corsHeaders);
  } catch (e) {
    const status = e instanceof GatewayError ? e.status : 500;
    const message = e instanceof Error ? e.message : String(e);
    await logCognitiveRequest({
      agency_id: agencyId,
      user_id: user.id,
      service: serviceOf(operation),
      operation,
      input: p,
      status: "error",
      error: message,
      latency_ms: Date.now() - started,
    });
    return jsonResponse(
      { error: message, code: status === 429 ? "rate_limited" : status === 402 ? "payment_required" : "internal" },
      status,
      corsHeaders,
    );
  }
}));

function serviceOf(op: string): string {
  switch (op) {
    case "reason": return "reasoning";
    case "predict": return "prediction";
    case "recommend": return "decision";
    case "explain": return "reasoning";
    case "learn": return "learning";
    case "retrieve_knowledge":
    case "store_knowledge": return "knowledge";
    case "evaluate_compliance": return "compliance";
    case "generate_report": return "executive";
    case "generate_communication": return "communication";
    case "simulate": return "simulation";
    case "security_scan": return "security";
    default: return "context";
  }
}

// deno-lint-ignore no-explicit-any
async function dispatch(op: string, db: any, agencyId: string, userId: string, p: Params) {
  switch (op) {
    case "snapshot": return await buildOrgSnapshot(db, agencyId);
    case "retrieve_knowledge": return await opRetrieveKnowledge(db, agencyId, p);
    case "store_knowledge": return await opStoreKnowledge(db, agencyId, userId, p);
    case "reason": return await opReason(db, agencyId, userId, p);
    case "predict": return await opPredict(db, agencyId, p);
    case "recommend": return await opRecommend(db, agencyId, p);
    case "explain": return await opExplain(db, agencyId, p);
    case "learn": return await opLearn(db, agencyId, userId, p);
    case "evaluate_compliance": return await opEvaluateCompliance(db, agencyId, p);
    case "generate_report": return await opGenerateReport(db, agencyId, userId, p);
    case "generate_communication": return await opGenerateCommunication(db, agencyId, userId, p);
    case "simulate": return await opSimulate(db, agencyId, userId, p);
    case "security_scan": return await opSecurityScan(db, agencyId);
    default: throw new Error("unreachable");
  }
}

// ---------- Knowledge Intelligence ----------

// deno-lint-ignore no-explicit-any
async function opRetrieveKnowledge(db: any, agencyId: string, p: Params) {
  const query = str(p.query, 2000);
  if (!query) throw new GatewayError(400, "query is required.");
  const limit = Math.min(Math.max(num(p.limit, 10), 1), 50);
  const [memories, articles] = await Promise.all([
    retrieveMemory(db, agencyId, query, limit, typeof p.scope === "string" ? p.scope : null),
    retrieveKnowledgeArticles(db, agencyId, query, 5),
  ]);
  return { query, memories, articles };
}

// deno-lint-ignore no-explicit-any
async function opStoreKnowledge(db: any, agencyId: string, userId: string, p: Params) {
  const content = str(p.content, 20000);
  if (!content) throw new GatewayError(400, "content is required.");

  const memory = await storeMemory(db, {
    agency_id: agencyId,
    scope: str(p.scope, 40) || "organizational",
    kind: str(p.kind, 40) || "fact",
    title: str(p.title, 200) || null,
    content,
    source_entity: str(p.source_entity, 60) || null,
    source_id: isUuid(p.source_id) ? p.source_id as string : null,
    tags: Array.isArray(p.tags) ? (p.tags as unknown[]).map((t) => String(t).slice(0, 40)).slice(0, 20) : [],
    importance: clampScore(p.importance),
    metadata: (p.metadata ?? {}) as Record<string, unknown>,
    created_by: userId,
  });

  // Entity extraction + relationship mapping into the knowledge graph.
  let graph: { entities: unknown[]; relations: unknown[] } = { entities: [], relations: [] };
  if (p.extract_entities !== false) {
    try {
      const extracted = await cognitiveJson<{
        entities: Array<{ type: string; key: string; label: string }>;
        relations: Array<{ from: string; to: string; relation: string }>;
      }>(
        "You extract workforce-operations entities and relationships from text. Entity types: worker, client, site, job, skill, certification, policy, shift, invoice, incident, system. Keys must be lowercase slugs. Limit to the 10 most significant entities and 10 relations.",
        content,
        '{"entities":[{"type":"","key":"","label":""}],"relations":[{"from":"<entity key>","to":"<entity key>","relation":""}]}',
      );
      const ids = new Map<string, string>();
      for (const e of (extracted.entities ?? []).slice(0, 10)) {
        const id = await upsertGraphEntity(db, agencyId, {
          entity_type: String(e.type ?? "concept").slice(0, 40),
          entity_key: String(e.key ?? e.label ?? "").toLowerCase().slice(0, 120),
          label: String(e.label ?? e.key ?? "").slice(0, 200),
          attributes: { from_memory: memory.id },
        });
        if (id) ids.set(String(e.key ?? "").toLowerCase(), id);
      }
      for (const r of (extracted.relations ?? []).slice(0, 10)) {
        const from = ids.get(String(r.from ?? "").toLowerCase());
        const to = ids.get(String(r.to ?? "").toLowerCase());
        if (from && to && from !== to) {
          await upsertGraphEdge(db, agencyId, from, to, String(r.relation ?? "related_to").slice(0, 60));
        }
      }
      graph = { entities: extracted.entities ?? [], relations: extracted.relations ?? [] };
    } catch { /* graph extraction is best-effort */ }
  }
  return { memory, graph };
}

// ---------- Reasoning Intelligence ----------

const REASONING_DOMAINS = [
  "operational", "compliance", "scheduling", "recruiting",
  "payroll", "risk", "executive", "cross_domain",
];

// deno-lint-ignore no-explicit-any
async function opReason(db: any, agencyId: string, userId: string, p: Params) {
  const question = str(p.question, 4000);
  if (!question) throw new GatewayError(400, "question is required.");
  const domain = REASONING_DOMAINS.includes(str(p.domain, 40)) ? str(p.domain, 40) : "cross_domain";

  const key = cacheKey("reason", { question, domain });
  if (p.no_cache !== true) {
    const hit = await cacheGet(db, agencyId, key);
    if (hit) return { ...(hit as Record<string, unknown>), cached: true };
  }

  const [snapshot, memories, prefs] = await Promise.all([
    buildOrgSnapshot(db, agencyId),
    retrieveMemory(db, agencyId, question, 8),
    loadOrgPreferences(db, agencyId),
  ]);

  const result = await cognitiveJson<{
    steps: Array<{ kind: string; content: string; confidence?: number }>;
    conclusion: string;
    confidence: number;
    evidence: Array<{ source: string; detail: string }>;
    alternatives: Array<{ option: string; rationale: string; confidence?: number }>;
    risk: { level: string; factors: string[]; mitigation: string };
    explanation: string;
  }>(
    `You are WOIC, the cognitive core of a workforce operating system. Perform rigorous multi-step ${domain} reasoning.
Rules: ground every claim in the supplied organizational context or memory; never invent data; state uncertainty explicitly.
Produce 3-6 reasoning steps (kinds: observation, hypothesis, analysis, check, conclusion). Confidence values are 0-1.
Always include at least one alternative line of reasoning and an explicit risk assessment.`,
    JSON.stringify({ question, domain, snapshot, memories, preferences: prefs }),
    '{"steps":[{"kind":"","content":"","confidence":0}],"conclusion":"","confidence":0,"evidence":[{"source":"","detail":""}],"alternatives":[{"option":"","rationale":"","confidence":0}],"risk":{"level":"low|medium|high","factors":[""],"mitigation":""},"explanation":""}',
  );

  const { data: trace } = await db
    .from("woic_reasoning_traces")
    .insert({
      agency_id: agencyId,
      user_id: userId,
      domain,
      question,
      conclusion: str(result.conclusion, 8000),
      confidence: clampScore(result.confidence),
      evidence: result.evidence ?? [],
      alternatives: result.alternatives ?? [],
      risk: result.risk ?? {},
      explanation: str(result.explanation, 8000),
      subject_entity: str(p.subject_entity, 60) || null,
      subject_id: isUuid(p.subject_id) ? p.subject_id as string : null,
    })
    .select("id, created_at")
    .single();

  const steps = (result.steps ?? []).slice(0, 12).map((s, i) => ({
    trace_id: trace.id,
    agency_id: agencyId,
    step_no: i + 1,
    kind: String(s.kind ?? "analysis").slice(0, 40),
    content: str(s.content, 4000),
    confidence: clampScore(s.confidence),
    data: {},
  }));
  if (steps.length) await db.from("woic_reasoning_steps").insert(steps);

  const payload = { trace_id: trace.id, domain, question, ...result, cached: false };
  await cacheSet(db, agencyId, key, payload, 600);
  return payload;
}

// deno-lint-ignore no-explicit-any
async function opExplain(db: any, agencyId: string, p: Params) {
  const kind = str(p.target_kind, 40);
  const id = p.target_id;
  if (!isUuid(id)) throw new GatewayError(400, "target_id must be a uuid.");
  const table = {
    reasoning: "woic_reasoning_traces",
    recommendation: "woic_recommendations",
    decision: "woic_decisions",
    prediction: "woic_prediction_results",
    simulation: "woic_simulations",
    security: "woic_security_signals",
  }[kind];
  if (!table) throw new GatewayError(400, "target_kind must be one of reasoning|recommendation|decision|prediction|simulation|security.");

  const { data: record } = await db.from(table).select("*").eq("agency_id", agencyId).eq("id", id).maybeSingle();
  if (!record) throw new GatewayError(404, "Target not found.");

  const explanation = await cognitiveText(
    "You are WOIC. Explain the supplied intelligence artifact to an operations leader: what it says, why it was produced, the evidence behind it, the level of confidence, and what to do next. Be concrete, 150-250 words, no markdown headings.",
    JSON.stringify(record),
  );
  return { target_kind: kind, target_id: id, explanation, record };
}

// ---------- Prediction Intelligence ----------

const PREDICTION_KINDS = [
  "candidate_success", "worker_performance", "retention", "assignment_completion",
  "compliance_risk", "payroll_delay", "revenue_forecast", "capacity_forecast",
  "client_churn", "demand_forecast",
];

// deno-lint-ignore no-explicit-any
async function opPredict(db: any, agencyId: string, p: Params) {
  const kind = str(p.kind, 60);
  if (!PREDICTION_KINDS.includes(kind)) {
    throw new GatewayError(400, `kind must be one of: ${PREDICTION_KINDS.join(", ")}`);
  }
  const subjectEntity = str(p.subject_entity, 60) || "agency";
  const subjectId = isUuid(p.subject_id) ? p.subject_id as string : agencyId;

  const [snapshot, memories, history] = await Promise.all([
    buildOrgSnapshot(db, agencyId),
    retrieveMemory(db, agencyId, `${kind} ${subjectEntity}`, 6),
    db.from("woic_learning_history").select("kind, outcome, created_at")
      .eq("agency_id", agencyId).eq("kind", kind).order("created_at", { ascending: false }).limit(25),
  ]);

  const result = await cognitiveJson<{
    probability: number;
    confidence: number;
    contributing_factors: Array<{ factor: string; direction: string; weight: number }>;
    historical_comparison: string;
    recommended_actions: string[];
    narrative: string;
  }>(
    `You are the WOIC prediction engine. Produce a transparent ${kind} prediction. probability and confidence are 0-1.
List 3-6 contributing factors with direction (increases|decreases) and weight 0-1. Compare against historical outcomes when available. Give 2-4 concrete recommended actions.`,
    JSON.stringify({ kind, subject_entity: subjectEntity, subject_id: subjectId, snapshot, memories, learning_history: history?.data ?? [], inputs: p.inputs ?? {} }),
    '{"probability":0,"confidence":0,"contributing_factors":[{"factor":"","direction":"","weight":0}],"historical_comparison":"","recommended_actions":[""],"narrative":""}',
  );

  const { data: model } = await db
    .from("woic_prediction_models")
    .upsert(
      { agency_id: agencyId, name: kind, version: "5.0", status: "active", feature_set: {}, description: `WOIC cognitive core model for ${kind}` },
      { onConflict: "id", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle()
    .then(async (r: { data: { id: string } | null }) => {
      if (r.data) return r;
      return await db.from("woic_prediction_models").select("id").eq("name", kind).limit(1).maybeSingle();
    });

  const { data: stored } = await db
    .from("woic_prediction_results")
    .insert({
      agency_id: agencyId,
      model_id: model?.id ?? null,
      subject_entity: subjectEntity,
      subject_id: subjectId,
      prediction: {
        kind,
        probability: clampScore(result.probability),
        contributing_factors: result.contributing_factors ?? [],
        historical_comparison: result.historical_comparison ?? "",
        recommended_actions: result.recommended_actions ?? [],
        narrative: result.narrative ?? "",
      },
      confidence: clampScore(result.confidence),
      features_snapshot: { snapshot_at: snapshot.generated_at },
    })
    .select("id, produced_at")
    .maybeSingle();

  return { prediction_id: stored?.id ?? null, kind, ...result };
}

// ---------- Decision Intelligence ----------

// deno-lint-ignore no-explicit-any
async function opRecommend(db: any, agencyId: string, p: Params) {
  const objective = str(p.objective, 2000);
  if (!objective) throw new GatewayError(400, "objective is required.");
  const subjectEntity = str(p.subject_entity, 60) || "agency";
  const subjectId = isUuid(p.subject_id) ? p.subject_id as string : agencyId;

  const [snapshot, memories, prefs] = await Promise.all([
    buildOrgSnapshot(db, agencyId),
    retrieveMemory(db, agencyId, objective, 8),
    loadOrgPreferences(db, agencyId),
  ]);

  const result = await cognitiveJson<{
    recommendations: Array<{
      title: string; target_entity: string; target_id?: string; score: number;
      reasoning: string; evidence: string[]; risks: string[]; compliance_notes: string;
      expected_impact: string;
    }>;
    decision_summary: string;
    confidence: number;
  }>(
    `You are the WOIC decision engine. Evaluate business rules, historical outcomes, risk, compliance, predictions and organizational objectives, then produce 2-5 ranked recommendations.
Every recommendation MUST include reasoning, evidence, risks, compliance notes and expected impact. score is 0-1 (rank descending). Never output a recommendation without explainability.`,
    JSON.stringify({ objective, subject_entity: subjectEntity, snapshot, memories, preferences: prefs, options: p.options ?? [] }),
    '{"recommendations":[{"title":"","target_entity":"","score":0,"reasoning":"","evidence":[""],"risks":[""],"compliance_notes":"","expected_impact":""}],"decision_summary":"","confidence":0}',
  );

  const recs = (result.recommendations ?? []).slice(0, 5);
  const rows = recs.map((r) => ({
    agency_id: agencyId,
    kind: "cognitive",
    subject_entity: subjectEntity,
    subject_id: subjectId,
    target_entity: String(r.target_entity ?? "action").slice(0, 60),
    target_id: isUuid(r.target_id) ? r.target_id : subjectId,
    score: clampScore(r.score),
    reasoning: str(r.reasoning, 4000),
    why: { title: r.title, evidence: r.evidence ?? [], risks: r.risks ?? [], compliance: r.compliance_notes, impact: r.expected_impact },
    status: "proposed",
  }));
  const { data: inserted } = rows.length
    ? await db.from("woic_recommendations").insert(rows).select("id, score, reasoning, why")
    : { data: [] };

  const { data: decision } = await db
    .from("woic_decisions")
    .insert({
      agency_id: agencyId,
      kind: "recommendation_set",
      subject_entity: subjectEntity,
      subject_id: subjectId,
      confidence: clampScore(result.confidence),
      reasoning: str(result.decision_summary, 4000),
      alternative_options: recs.slice(1).map((r) => ({ title: r.title, score: r.score })),
      source: { objective, engine: "woic-cognitive-5.0" },
    })
    .select("id")
    .maybeSingle();

  return {
    decision_id: decision?.id ?? null,
    decision_summary: result.decision_summary,
    confidence: clampScore(result.confidence),
    recommendations: recs.map((r, i) => ({ ...r, id: inserted?.[i]?.id ?? null })),
  };
}

// ---------- Learning Intelligence ----------

// deno-lint-ignore no-explicit-any
async function opLearn(db: any, agencyId: string, userId: string, p: Params) {
  const signal = str(p.signal, 40);
  const allowed = ["accepted", "rejected", "corrected", "outcome", "preference"];
  if (!allowed.includes(signal)) throw new GatewayError(400, `signal must be one of: ${allowed.join(", ")}`);
  const targetKind = str(p.target_kind, 40) || "recommendation";
  const targetId = isUuid(p.target_id) ? p.target_id as string : null;

  await db.from("woic_feedback").insert({
    agency_id: agencyId,
    user_id: userId,
    target_kind: targetKind,
    target_id: targetId,
    signal,
    correction: str(p.correction, 4000) || null,
    weight: num(p.weight, 1),
    metadata: (p.metadata ?? {}) as Record<string, unknown>,
  });

  await db.from("woic_learning_history").insert({
    agency_id: agencyId,
    kind: targetKind,
    subject_entity: str(p.subject_entity, 60) || targetKind,
    subject_id: isUuid(p.subject_id) ? p.subject_id : targetId ?? agencyId,
    outcome: { signal, correction: str(p.correction, 2000), metadata: p.metadata ?? {} },
  });

  if (targetKind === "recommendation" && targetId) {
    await db.from("woic_recommendations")
      .update({ status: signal === "accepted" ? "accepted" : signal === "rejected" ? "rejected" : "reviewed" })
      .eq("agency_id", agencyId).eq("id", targetId);
  }

  // Reinforce organizational memory so future reasoning reflects the correction.
  const memoryKey = `${targetKind}:${signal}`;
  const { data: existing } = await db.from("woic_org_memory")
    .select("id, weight, value").eq("agency_id", agencyId).eq("kind", "learning").eq("key", memoryKey).maybeSingle();
  await db.from("woic_org_memory").upsert({
    id: existing?.id,
    agency_id: agencyId,
    kind: "learning",
    key: memoryKey,
    value: { last_correction: str(p.correction, 1000), count: (existing?.value?.count ?? 0) + 1 },
    weight: (existing?.weight ?? 0) + num(p.weight, 1),
    updated_at: new Date().toISOString(),
  }, { onConflict: "agency_id,kind,key" });

  if (signal === "corrected" && str(p.correction, 1)) {
    await storeMemory(db, {
      agency_id: agencyId,
      scope: "operational",
      kind: "correction",
      title: `User correction on ${targetKind}`,
      content: str(p.correction, 8000),
      source_entity: targetKind,
      source_id: targetId,
      importance: 0.9,
      created_by: userId,
    });
  }

  return { recorded: true, signal, target_kind: targetKind, target_id: targetId };
}

// ---------- Compliance Intelligence ----------

// deno-lint-ignore no-explicit-any
async function opEvaluateCompliance(db: any, agencyId: string, p: Params) {
  const subject = str(p.subject, 2000) || "agency-wide compliance posture";
  const [{ data: rules }, { data: events }, memories] = await Promise.all([
    db.from("woic_compliance_rules").select("code, name, description, cadence, grace_days, applies_to, active")
      .eq("agency_id", agencyId).eq("active", true).limit(100),
    db.from("woic_compliance_events").select("id, status, effective_at, expires_at, next_action_at, metadata")
      .eq("agency_id", agencyId).order("next_action_at", { ascending: true, nullsFirst: false }).limit(100),
    retrieveMemory(db, agencyId, `compliance policy ${subject}`, 6, "policy"),
  ]);

  const result = await cognitiveJson<{
    verdict: string;
    confidence: number;
    violations: Array<{ rule: string; severity: string; detail: string; remediation: string }>;
    at_risk: Array<{ rule: string; due: string; detail: string }>;
    evidence: string[];
    explanation: string;
  }>(
    "You are the WOIC compliance engine for a staffing platform. Evaluate the supplied rules, events and policy memory. verdict is one of compliant|at_risk|violation. confidence 0-1. Be precise and cite the rule codes you rely on.",
    JSON.stringify({ subject, rules: rules ?? [], events: events ?? [], policy_memory: memories, context: p.context ?? {} }),
    '{"verdict":"","confidence":0,"violations":[{"rule":"","severity":"","detail":"","remediation":""}],"at_risk":[{"rule":"","due":"","detail":""}],"evidence":[""],"explanation":""}',
  );
  return { subject, ...result, confidence: clampScore(result.confidence) };
}

// ---------- Executive Intelligence ----------

const BRIEF_KINDS = ["morning", "weekly", "monthly", "quarterly", "annual", "board", "investor", "qa"];

// deno-lint-ignore no-explicit-any
async function opGenerateReport(db: any, agencyId: string, userId: string, p: Params) {
  const kind = BRIEF_KINDS.includes(str(p.kind, 20)) ? str(p.kind, 20) : "morning";
  const question = str(p.question, 2000);
  const snapshot = await buildOrgSnapshot(db, agencyId);
  const memories = await retrieveMemory(db, agencyId, question || `${kind} executive brief`, 8);

  if (kind === "qa") {
    if (!question) throw new GatewayError(400, "question is required for executive Q&A.");
    const answer = await cognitiveText(
      "You are WOIC executive intelligence. Answer the executive's question directly using only the supplied organizational data. State figures, then implications, then the recommended next action. If data is missing, say so plainly.",
      JSON.stringify({ question, snapshot, memories }),
    );
    return { kind, question, answer };
  }

  const result = await cognitiveJson<{
    title: string;
    summary: string;
    sections: Array<{ heading: string; body: string; highlights?: string[] }>;
    metrics: Record<string, unknown>;
  }>(
    `You are WOIC executive intelligence. Produce a ${kind} brief for the leadership of a staffing organization.
Use 4-7 sections (e.g. Operations, Workforce, Compliance, Financials, Risks, Opportunities, Recommended Actions). Ground every number in the snapshot. No filler.`,
    JSON.stringify({ kind, snapshot, memories, focus: p.focus ?? null }),
    '{"title":"","summary":"","sections":[{"heading":"","body":"","highlights":[""]}],"metrics":{}}',
  );

  const { data: brief } = await db.from("woic_executive_briefs").insert({
    agency_id: agencyId,
    kind,
    period_start: typeof p.period_start === "string" ? p.period_start : null,
    period_end: typeof p.period_end === "string" ? p.period_end : null,
    title: str(result.title, 200) || `${kind} brief`,
    summary: str(result.summary, 8000),
    sections: result.sections ?? [],
    metrics: result.metrics ?? snapshot as unknown as Record<string, unknown>,
    created_by: userId,
  }).select("id, created_at").maybeSingle();

  return { brief_id: brief?.id ?? null, kind, ...result };
}

// ---------- Communication Intelligence ----------

// deno-lint-ignore no-explicit-any
async function opGenerateCommunication(db: any, agencyId: string, userId: string, p: Params) {
  const channel = str(p.channel, 30) || "email";
  const audience = str(p.audience, 40) || "client";
  const intent = str(p.intent, 4000);
  if (!intent) throw new GatewayError(400, "intent is required.");
  const tone = str(p.tone, 40) || "professional";
  const language = str(p.language, 10) || "en";

  const memories = await retrieveMemory(db, agencyId, intent, 5);
  const result = await cognitiveJson<{ subject: string; body: string; notes: string }>(
    `You are WOIC communication intelligence. Write a ${channel} message for a ${audience} audience in a ${tone} tone, written entirely in language code "${language}".
Respect channel constraints: SMS under 320 characters, notifications under 140 characters, emails complete with greeting and sign-off. Never invent facts not present in the context.`,
    JSON.stringify({ intent, context: p.context ?? {}, memories }),
    '{"subject":"","body":"","notes":""}',
  );

  const { data: comm } = await db.from("woic_communications").insert({
    agency_id: agencyId,
    channel,
    audience,
    tone,
    language,
    subject: str(result.subject, 300) || null,
    body: str(result.body, 20000),
    context: { intent, ...(p.context as Record<string, unknown> ?? {}) },
    created_by: userId,
  }).select("id, created_at").maybeSingle();

  return { communication_id: comm?.id ?? null, channel, audience, tone, language, ...result };
}

// ---------- Simulation Intelligence ----------

// deno-lint-ignore no-explicit-any
async function opSimulate(db: any, agencyId: string, userId: string, p: Params) {
  const scenario = str(p.scenario, 4000);
  if (!scenario) throw new GatewayError(400, "scenario is required.");
  const snapshot = await buildOrgSnapshot(db, agencyId);

  const result = await cognitiveJson<{
    outcomes: Array<{ horizon: string; description: string; probability: number; metrics: Record<string, unknown> }>;
    recommendations: Array<{ action: string; rationale: string; impact: string }>;
    confidence: number;
    assumptions: string[];
  }>(
    "You are the WOIC simulation engine. Model the scenario against the organization's current state. Provide 2-4 outcome branches with horizons (30d/90d/1y), probabilities 0-1, and quantified metric deltas. List explicit assumptions.",
    JSON.stringify({ scenario, inputs: p.inputs ?? {}, snapshot }),
    '{"outcomes":[{"horizon":"","description":"","probability":0,"metrics":{}}],"recommendations":[{"action":"","rationale":"","impact":""}],"confidence":0,"assumptions":[""]}',
  );

  const { data: sim } = await db.from("woic_simulations").insert({
    agency_id: agencyId,
    scenario,
    inputs: (p.inputs ?? {}) as Record<string, unknown>,
    results: { outcomes: result.outcomes ?? [], assumptions: result.assumptions ?? [] },
    recommendations: result.recommendations ?? [],
    confidence: clampScore(result.confidence),
    created_by: userId,
  }).select("id, created_at").maybeSingle();

  return { simulation_id: sim?.id ?? null, scenario, ...result };
}

// ---------- Security Intelligence ----------

// deno-lint-ignore no-explicit-any
async function opSecurityScan(db: any, agencyId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [{ data: events }, { data: cognitive }, { data: agentRuns }] = await Promise.all([
    db.from("ttos_events").select("event_type, entity_type, actor_id, created_at")
      .eq("agency_id", agencyId).gte("created_at", since).limit(500),
    db.from("woic_cognitive_requests").select("user_id, operation, status, created_at")
      .eq("agency_id", agencyId).gte("created_at", since).limit(500),
    db.from("automation_agent_runs").select("id, status, created_at")
      .eq("agency_id", agencyId).gte("created_at", since).limit(200),
  ]);

  const result = await cognitiveJson<{
    signals: Array<{ kind: string; severity: string; title: string; detail: string; evidence: Record<string, unknown> }>;
    posture: string;
  }>(
    `You are WOIC security intelligence. Detect anomalies across the last 24h of platform activity.
Signal kinds: permission_anomaly, fraud_indicator, identity_anomaly, behavior_anomaly, suspicious_automation, data_access, security_event.
Severity: low|medium|high|critical. Only emit a signal when the evidence genuinely supports it — return an empty list if activity is normal.`,
    JSON.stringify({ events: events ?? [], cognitive_requests: cognitive ?? [], agent_runs: agentRuns ?? [] }),
    '{"signals":[{"kind":"","severity":"","title":"","detail":"","evidence":{}}],"posture":""}',
  );

  const signals = (result.signals ?? []).slice(0, 20);
  if (signals.length) {
    await db.from("woic_security_signals").insert(signals.map((s) => ({
      agency_id: agencyId,
      kind: String(s.kind ?? "security_event").slice(0, 40),
      severity: ["low", "medium", "high", "critical"].includes(String(s.severity)) ? String(s.severity) : "low",
      title: str(s.title, 200) || "Security signal",
      detail: str(s.detail, 4000),
      evidence: s.evidence ?? {},
    })));
  }
  return { posture: result.posture ?? "", signals, scanned_events: events?.length ?? 0 };
}
