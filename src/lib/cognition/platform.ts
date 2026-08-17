// WOIC Cognitive Control & Observability Workspace — client contract.
// Platform Contract PC-6.0B / CapSpec-6.0B / PDNA-6.0B.
//
// This module contains NO cognition. No reasoning, memory, model routing,
// evidence scoring, claim evaluation, faculty orchestration or planning exists
// in the frontend. It is a typed description of the Phase 6.0A Cognitive
// Control API surface plus presentation taxonomies. Every operational value
// rendered by the workspace is produced by the backend; nothing here computes
// cognitive state, and nothing is ever simulated when a capability is pending.

export const PLATFORM_CONTRACT = "PC-6.0B";
export const CAPABILITY_SPEC = "CapSpec-6.0B";
export const PLATFORM_DNA = "PDNA-6.0B";
export const ARCHITECTURE_VERSION = "IWOS / WOIC v2.0.0-alpha.1";
export const CONSTITUTION_VERSION = "v1.0";

/** The single Generation Two backend entry point (Phase 6.0A). */
export const COGNITIVE_CONTROL_FUNCTION = "woic-cognitive-control";

export type AppRoleLike =
  | "super_admin" | "agency_admin" | "agency_owner" | "dispatcher" | "compliance_specialist";

/* ------------------------------------------------------------- capabilities */

export type CognitionCapabilityKey =
  | "cognition.overview"
  | "sessions.list"
  | "sessions.get"
  | "requests.list"
  | "requests.get"
  | "requests.flow"
  | "faculties.list"
  | "faculties.get"
  | "evidence.list"
  | "evidence.get"
  | "claims.list"
  | "claims.get"
  | "contradictions.list"
  | "uncertainty.list"
  | "models.operations"
  | "budgets.usage"
  | "escalations.list"
  | "escalations.acknowledge"
  | "performance.metrics"
  | "architecture.map";

export interface CapabilityDef {
  key: CognitionCapabilityKey;
  label: string;
  description: string;
  /** Method name invoked through the 6.0A Cognitive Control API. */
  method: string;
  mutating: boolean;
  roles: AppRoleLike[];
}

export const CAPABILITIES: CapabilityDef[] = [
  { key: "cognition.overview", label: "Cognitive Overview", description: "Aggregated cognitive health, volume, confidence, cost and escalations.", method: "cognition.overview", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "sessions.list", label: "Active Sessions", description: "Open cognitive sessions with objective, budget and risk.", method: "sessions.list", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "sessions.get", label: "Session Detail", description: "Objective → requests → faculty activity → evidence → claims.", method: "sessions.get", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "requests.list", label: "Cognitive Requests", description: "Cognitive operations with status, risk, confidence and cost.", method: "requests.list", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "requests.get", label: "Request Inspector", description: "Operational metadata for one cognitive request.", method: "requests.get", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "requests.flow", label: "Cognitive Flow", description: "Request → context → faculty → evidence → claims → evaluation → result.", method: "requests.flow", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "faculties.list", label: "Faculty Registry", description: "Registered cognitive faculties, versions, health and requirements.", method: "faculties.list", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "faculties.get", label: "Faculty Detail", description: "One faculty with dependencies, permissions and domains.", method: "faculties.get", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "evidence.list", label: "Evidence Explorer", description: "Evidence records with provenance, freshness and reliability.", method: "evidence.list", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "evidence.get", label: "Evidence Detail", description: "One evidence record and its contribution to claims.", method: "evidence.get", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "claims.list", label: "Claims", description: "Structured claims with state, support and validity.", method: "claims.list", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "claims.get", label: "Claim Detail", description: "Evidence for and against a claim, with history.", method: "claims.get", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "contradictions.list", label: "Contradictions", description: "Conflicting evidence and claims requiring review.", method: "contradictions.list", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "uncertainty.list", label: "Uncertainty", description: "Declared unknowns, gaps and low-reliability inputs.", method: "uncertainty.list", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "models.operations", label: "Model Operations", description: "Provider-neutral model health, usage, cost and fallback state.", method: "models.operations", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "budgets.usage", label: "Cognitive Budgets", description: "Token, compute, retrieval, tool and cost consumption.", method: "budgets.usage", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "escalations.list", label: "Escalations", description: "Cognitive operations requiring human attention.", method: "escalations.list", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "escalations.acknowledge", label: "Acknowledge Escalation", description: "Record human acknowledgement of a cognitive escalation.", method: "escalations.acknowledge", mutating: true, roles: ["agency_admin", "super_admin"] },
  { key: "performance.metrics", label: "Cognitive Performance", description: "Latency, throughput, accuracy and reliability metrics.", method: "performance.metrics", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "architecture.map", label: "Cognitive Architecture", description: "Faculty → DNA → contract → CapSpec → dependency mapping.", method: "architecture.map", mutating: false, roles: ["agency_admin", "super_admin"] },
];

export const capabilityByKey = (key: CognitionCapabilityKey): CapabilityDef =>
  CAPABILITIES.find((c) => c.key === key) ?? {
    key, label: key, description: "", method: key, mutating: false, roles: ["super_admin"],
  };

/* ---------------------------------------------------------------- taxonomies */

export type RequestState =
  | "QUEUED" | "CONTEXT" | "REASONING" | "EVALUATING"
  | "COMPLETED" | "FAILED" | "ESCALATED" | "ABANDONED" | "INSUFFICIENT_EVIDENCE";

export const REQUEST_STATES: RequestState[] = [
  "QUEUED", "CONTEXT", "REASONING", "EVALUATING",
  "COMPLETED", "FAILED", "ESCALATED", "ABANDONED", "INSUFFICIENT_EVIDENCE",
];

export const REQUEST_STATE_STYLES: Record<RequestState, string> = {
  QUEUED: "border-slate-500/50 bg-slate-500/10 text-slate-300",
  CONTEXT: "border-sky-500/50 bg-sky-500/10 text-sky-400",
  REASONING: "border-cyan-500/50 bg-cyan-500/10 text-cyan-300",
  EVALUATING: "border-indigo-500/50 bg-indigo-500/10 text-indigo-300",
  COMPLETED: "border-emerald-600/50 bg-emerald-600/10 text-emerald-400",
  FAILED: "border-red-500/60 bg-red-500/10 text-red-400",
  ESCALATED: "border-orange-500/60 bg-orange-500/10 text-orange-400",
  ABANDONED: "border-zinc-500/50 bg-zinc-500/10 text-zinc-400",
  INSUFFICIENT_EVIDENCE: "border-amber-500/60 bg-amber-500/10 text-amber-400",
};

export type ClaimState = "PROPOSED" | "SUPPORTED" | "CONTESTED" | "REJECTED" | "STALE" | "SUPERSEDED";

export const CLAIM_STATES: ClaimState[] = [
  "PROPOSED", "SUPPORTED", "CONTESTED", "REJECTED", "STALE", "SUPERSEDED",
];

export const CLAIM_STATE_STYLES: Record<ClaimState, string> = {
  PROPOSED: "border-slate-500/50 bg-slate-500/10 text-slate-300",
  SUPPORTED: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  CONTESTED: "border-orange-500/60 bg-orange-500/10 text-orange-400",
  REJECTED: "border-red-500/60 bg-red-500/10 text-red-400",
  STALE: "border-amber-500/50 bg-amber-500/10 text-amber-400",
  SUPERSEDED: "border-violet-500/50 bg-violet-500/10 text-violet-300",
};

export type FacultyStatus = "ACTIVE" | "DEGRADED" | "UNAVAILABLE" | "PLANNED";

export const FACULTY_STATUSES: FacultyStatus[] = ["ACTIVE", "DEGRADED", "UNAVAILABLE", "PLANNED"];

export const FACULTY_STATUS_STYLES: Record<FacultyStatus, string> = {
  ACTIVE: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  DEGRADED: "border-amber-500/60 bg-amber-500/10 text-amber-400",
  UNAVAILABLE: "border-red-500/60 bg-red-500/10 text-red-400",
  PLANNED: "border-slate-500/50 bg-slate-500/10 text-slate-400",
};

/** PLANNED faculties are never operational, whatever else the record claims. */
export const isOperationalFaculty = (status: unknown) => normalizeFacultyStatus(status) === "ACTIVE";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export const RISK_STYLES: Record<RiskLevel, string> = {
  low: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  medium: "border-amber-500/50 bg-amber-500/10 text-amber-400",
  high: "border-orange-500/60 bg-orange-500/10 text-orange-400",
  critical: "border-red-500/60 bg-red-500/10 text-red-400",
};

export type EscalationReason =
  | "insufficient_evidence" | "contradiction" | "high_risk" | "permission"
  | "low_confidence" | "budget_exhaustion" | "unsupported_capability" | "governance_ambiguity";

export const ESCALATION_REASONS: Array<{ key: EscalationReason; label: string; detail: string }> = [
  { key: "insufficient_evidence", label: "Insufficient Evidence", detail: "WOIC could not ground the conclusion in adequate evidence." },
  { key: "contradiction", label: "Contradiction", detail: "Conflicting evidence or claims could not be reconciled." },
  { key: "high_risk", label: "High Risk", detail: "The operation exceeds the autonomous risk threshold." },
  { key: "permission", label: "Permission Issue", detail: "Required data or capability is outside the permitted scope." },
  { key: "low_confidence", label: "Low Confidence", detail: "Confidence fell below the governed threshold." },
  { key: "budget_exhaustion", label: "Budget Exhaustion", detail: "The cognitive budget for the session or tenant was exhausted." },
  { key: "unsupported_capability", label: "Unsupported Capability", detail: "No registered faculty can satisfy the requested capability." },
  { key: "governance_ambiguity", label: "Governance Ambiguity", detail: "Constitutional or contractual interpretation requires a human." },
];

export const escalationReasonLabel = (k: unknown) =>
  ESCALATION_REASONS.find((r) => r.key === String(k))?.label ?? str(k, "—");

export type UncertaintyKind =
  | "missing_information" | "conflicting_evidence" | "stale_knowledge"
  | "low_reliability_source" | "unknown_dependency" | "model_uncertainty" | "prediction_uncertainty";

export const UNCERTAINTY_KINDS: Array<{ key: UncertaintyKind; label: string; detail: string }> = [
  { key: "missing_information", label: "Missing Information", detail: "Required inputs were not available to the operation." },
  { key: "conflicting_evidence", label: "Conflicting Evidence", detail: "Evidence points in more than one direction." },
  { key: "stale_knowledge", label: "Stale Knowledge", detail: "The supporting knowledge is older than its freshness policy." },
  { key: "low_reliability_source", label: "Low Reliability Source", detail: "A source with poor reliability influenced the result." },
  { key: "unknown_dependency", label: "Unknown Dependency", detail: "A dependency of the conclusion is unresolved." },
  { key: "model_uncertainty", label: "Model Uncertainty", detail: "The model itself reported or exhibited instability." },
  { key: "prediction_uncertainty", label: "Prediction Uncertainty", detail: "Forecast variance is wide relative to the decision." },
];

export const uncertaintyLabel = (k: unknown) =>
  UNCERTAINTY_KINDS.find((u) => u.key === String(k))?.label ?? str(k, "—");

/** Operational metadata only. Never a reconstruction of private reasoning. */
export const COGNITIVE_FLOW_STAGES = [
  "Request", "Context", "Faculty Invocation", "Evidence", "Claims", "Evaluation", "Result",
] as const;

export type FlowStage = typeof COGNITIVE_FLOW_STAGES[number];

/* --------------------------------------------------------- request inspector */

export const REQUEST_SECTIONS: Array<{ key: string; label: string }> = [
  { key: "objective", label: "Objective" },
  { key: "initiator", label: "Initiator" },
  { key: "domain", label: "Domain" },
  { key: "status", label: "Status" },
  { key: "risk", label: "Risk" },
  { key: "requested_capabilities", label: "Requested Capabilities" },
  { key: "faculties_used", label: "Faculties Used" },
  { key: "evidence", label: "Evidence" },
  { key: "claims", label: "Claims" },
  { key: "assumptions", label: "Assumptions" },
  { key: "uncertainty", label: "Uncertainty" },
  { key: "alternatives", label: "Alternatives" },
  { key: "confidence", label: "Confidence" },
  { key: "knowledge_references", label: "Knowledge References" },
  { key: "graph_references", label: "Graph References" },
  { key: "timeline_references", label: "Timeline References" },
  { key: "simulation_references", label: "Simulation References" },
  { key: "optimization_references", label: "Optimization References" },
  { key: "decision_references", label: "Decision References" },
  { key: "model_metadata", label: "Model Metadata" },
  { key: "cost", label: "Cost" },
  { key: "latency", label: "Latency" },
  { key: "warnings", label: "Warnings" },
  { key: "escalations", label: "Escalations" },
];

/** Keys the workspace must never render, even if a backend leaks them. */
export const FORBIDDEN_KEYS = [
  "chain_of_thought", "chainofthought", "cot", "private_reasoning",
  "raw_reasoning", "scratchpad", "internal_monologue", "hidden_thoughts",
];

export function isForbiddenKey(key: string): boolean {
  const k = key.toLowerCase().replace(/[\s-]/g, "_");
  return FORBIDDEN_KEYS.includes(k);
}

/** Strips private reasoning fields from any backend payload before render. */
export function redactPrivateReasoning<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => redactPrivateReasoning(v)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (isForbiddenKey(k)) continue;
      out[k] = redactPrivateReasoning(v);
    }
    return out as unknown as T;
  }
  return value;
}

/* ------------------------------------------------------------------ settings */

export type WorkspaceMode = "executive" | "operator" | "engineering";

export const WORKSPACE_MODES: Array<{ key: WorkspaceMode; label: string }> = [
  { key: "executive", label: "Executive" },
  { key: "operator", label: "Operator" },
  { key: "engineering", label: "Engineering" },
];

export interface CognitionSettings {
  mode: WorkspaceMode;
  refreshMs: number;
  density: "comfortable" | "dense";
  showPlannedFaculties: boolean;
  pageSize: number;
}

export const DEFAULT_COGNITION_SETTINGS: CognitionSettings = {
  mode: "operator",
  refreshMs: 20000,
  density: "dense",
  showPlannedFaculties: true,
  pageSize: 25,
};

export const COGNITION_SETTINGS_KEY = "iwos.cognition.settings.v1";

/* ------------------------------------------------------------- local store */

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? ({ ...fallback, ...(JSON.parse(raw) as object) } as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — settings simply do not persist */
  }
}

/* --------------------------------------------------------------- utilities */

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map((v) => asRecord(v)) : [];
}

export function str(value: unknown, fallback = ""): string {
  return value == null ? fallback : typeof value === "object" ? JSON.stringify(value) : String(value);
}

export function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export function normalizeRequestState(value: unknown): RequestState | null {
  const v = str(value).toUpperCase().replace(/[\s-]/g, "_");
  return (REQUEST_STATES as string[]).includes(v) ? (v as RequestState) : null;
}

export function normalizeClaimState(value: unknown): ClaimState | null {
  const v = str(value).toUpperCase().replace(/[\s-]/g, "_");
  return (CLAIM_STATES as string[]).includes(v) ? (v as ClaimState) : null;
}

export function normalizeFacultyStatus(value: unknown): FacultyStatus | null {
  const v = str(value).toUpperCase().replace(/[\s-]/g, "_");
  return (FACULTY_STATUSES as string[]).includes(v) ? (v as FacultyStatus) : null;
}

export function normalizeRisk(value: unknown): RiskLevel | null {
  const v = str(value).toLowerCase();
  return (["low", "medium", "high", "critical"] as string[]).includes(v) ? (v as RiskLevel) : null;
}

/**
 * Confidence is only shown when the backend actually reported it. The
 * workspace never invents precision for an operation that declared none.
 */
export function confidencePercent(value: unknown): number | null {
  const n = num(value);
  if (n == null) return null;
  const pct = n <= 1 ? n * 100 : n;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

export function formatCost(value: unknown): string {
  const n = num(value);
  if (n == null) return "—";
  return n >= 1 ? `$${n.toFixed(2)}` : `$${n.toFixed(4)}`;
}

export function formatLatency(value: unknown): string {
  const n = num(value);
  if (n == null) return "—";
  return n >= 1000 ? `${(n / 1000).toFixed(2)}s` : `${Math.round(n)}ms`;
}
