// WOIC Reasoning & Evidence Workspace — client contract.
// Platform Contract PC-6.3B / CapSpec-6.3B / PDNA-6.3B.
//
// This module contains NO reasoning engine. No conclusions are derived, no
// confidence is computed, no evidence is weighted and no causal classification
// is inferred in the browser. It is a typed description of the Phase 6.3A
// Reasoning API surface plus presentation taxonomies. Every operational value
// rendered by the workspace is produced by the backend; when a capability is
// pending nothing is manufactured.

export const PLATFORM_CONTRACT = "PC-6.3B";
export const CAPABILITY_SPEC = "CapSpec-6.3B";
export const PLATFORM_DNA = "PDNA-6.3B";
export const ARCHITECTURE_VERSION = "IWOS / WOIC v2.0.0-alpha.4";

/** The single Generation Two reasoning entry point (Phase 6.3A). */
export const REASONING_FUNCTION = "woic-reasoning";

export type AppRoleLike =
  | "super_admin" | "agency_admin" | "agency_owner" | "dispatcher" | "compliance_specialist";

/* ------------------------------------------------------------- capabilities */

export type ReasoningCapabilityKey =
  | "reasoning.overview"
  | "reasoning.requests.list"
  | "reasoning.requests.get"
  | "reasoning.conclusions.list"
  | "reasoning.conclusions.get"
  | "reasoning.hypotheses.list"
  | "reasoning.evidence.list"
  | "reasoning.contradictions.list"
  | "reasoning.alternatives.list"
  | "reasoning.critique.list"
  | "reasoning.causality.list"
  | "reasoning.disagreements.list"
  | "reasoning.history.list"
  | "reasoning.health.get"
  // governed operator requests — executed by 6.3A, never locally
  | "reasoning.critique.request"
  | "reasoning.contradiction.review"
  | "reasoning.disagreement.escalate"
  | "reasoning.alternative.simulate"
  | "reasoning.alternative.to_decision"
  | "reasoning.alternative.reason_further"
  | "reasoning.evidence.request";

export interface CapabilityDef {
  key: ReasoningCapabilityKey;
  label: string;
  description: string;
  /** Method name invoked through the 6.3A Reasoning API. */
  method: string;
  mutating: boolean;
  roles: AppRoleLike[];
}

const READ_ROLES: AppRoleLike[] = ["agency_admin", "super_admin"];
const WRITE_ROLES: AppRoleLike[] = ["agency_admin", "super_admin"];

export const CAPABILITIES: CapabilityDef[] = [
  { key: "reasoning.overview", label: "Reasoning Overview", description: "Aggregated reasoning volume, confidence, coverage, latency and cost.", method: "reasoning.overview", mutating: false, roles: READ_ROLES },
  { key: "reasoning.requests.list", label: "Active Reasoning", description: "Reasoning requests currently in flight or recently completed.", method: "reasoning.requests.list", mutating: false, roles: READ_ROLES },
  { key: "reasoning.requests.get", label: "Reasoning Request", description: "One reasoning request with evidence, claims, conclusions and review.", method: "reasoning.requests.get", mutating: false, roles: READ_ROLES },
  { key: "reasoning.conclusions.list", label: "Conclusions", description: "Conclusions reported by WOIC with status, confidence and validity.", method: "reasoning.conclusions.list", mutating: false, roles: READ_ROLES },
  { key: "reasoning.conclusions.get", label: "Conclusion Detail", description: "One conclusion with supporting and contradicting evidence.", method: "reasoning.conclusions.get", mutating: false, roles: READ_ROLES },
  { key: "reasoning.hypotheses.list", label: "Hypotheses", description: "Open hypotheses with evidence for and against and required information.", method: "reasoning.hypotheses.list", mutating: false, roles: READ_ROLES },
  { key: "reasoning.evidence.list", label: "Evidence", description: "Evidence records with source, stance, freshness and reliability.", method: "reasoning.evidence.list", mutating: false, roles: READ_ROLES },
  { key: "reasoning.contradictions.list", label: "Contradictions", description: "Conflicting evidence and the claims and conclusions it affects.", method: "reasoning.contradictions.list", mutating: false, roles: READ_ROLES },
  { key: "reasoning.alternatives.list", label: "Alternatives", description: "Alternative explanations and recommendations considered by WOIC.", method: "reasoning.alternatives.list", mutating: false, roles: READ_ROLES },
  { key: "reasoning.critique.list", label: "Critical Review", description: "Critical reviews with weak assumptions, counterexamples and revisions.", method: "reasoning.critique.list", mutating: false, roles: READ_ROLES },
  { key: "reasoning.causality.list", label: "Causality", description: "Causal claims with their backend classification and evidence.", method: "reasoning.causality.list", mutating: false, roles: READ_ROLES },
  { key: "reasoning.disagreements.list", label: "Model Disagreement", description: "Faculty or model disagreements and their resolution status.", method: "reasoning.disagreements.list", mutating: false, roles: READ_ROLES },
  { key: "reasoning.history.list", label: "Reasoning History", description: "Original result, review, revision, decision and actual outcome.", method: "reasoning.history.list", mutating: false, roles: READ_ROLES },
  { key: "reasoning.health.get", label: "Reasoning Health", description: "Service and model health, latency, failures, coverage and handoffs.", method: "reasoning.health.get", mutating: false, roles: READ_ROLES },

  { key: "reasoning.critique.request", label: "Request Critical Review", description: "Ask WOIC to critically review a conclusion. Executed by 6.3A.", method: "reasoning.critique.request", mutating: true, roles: WRITE_ROLES },
  { key: "reasoning.contradiction.review", label: "Mark for Human Review", description: "Route a contradiction to human review through the backend.", method: "reasoning.contradiction.review", mutating: true, roles: WRITE_ROLES },
  { key: "reasoning.disagreement.escalate", label: "Escalate Disagreement", description: "Escalate an unresolved model disagreement.", method: "reasoning.disagreement.escalate", mutating: true, roles: WRITE_ROLES },
  { key: "reasoning.alternative.simulate", label: "Send to Simulation", description: "Hand an alternative to the Simulation Workspace via 6.3A.", method: "reasoning.alternative.simulate", mutating: true, roles: WRITE_ROLES },
  { key: "reasoning.alternative.to_decision", label: "Send to Decision Console", description: "Hand an alternative to the Decision Console via 6.3A.", method: "reasoning.alternative.to_decision", mutating: true, roles: WRITE_ROLES },
  { key: "reasoning.alternative.reason_further", label: "Reason Further", description: "Request additional reasoning on an alternative.", method: "reasoning.alternative.reason_further", mutating: true, roles: WRITE_ROLES },
  { key: "reasoning.evidence.request", label: "Request Missing Evidence", description: "Ask perception/knowledge to supply missing evidence.", method: "reasoning.evidence.request", mutating: true, roles: WRITE_ROLES },
];

export const capabilityByKey = (key: ReasoningCapabilityKey): CapabilityDef =>
  CAPABILITIES.find((c) => c.key === key) ?? {
    key, label: key, description: "", method: key, mutating: false, roles: ["super_admin"],
  };

/* ---------------------------------------------------------------- utilities */

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

/** Percentage view of a backend-reported ratio or percentage. Never computed from parts. */
export function scorePercent(value: unknown): number | null {
  const n = num(value);
  if (n == null) return null;
  const pct = n <= 1 && n >= 0 ? n * 100 : n;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

/* -------------------------------------------------------------- redaction */

/** Fields that would expose private chain-of-thought. Stripped at the boundary. */
const FORBIDDEN_KEYS = [
  "chain_of_thought", "chainofthought", "cot", "raw_thoughts", "thoughts",
  "internal_monologue", "scratchpad", "hidden_reasoning", "private_reasoning",
  "raw_prompt", "system_prompt", "deliberation_trace",
];

export function isForbiddenKey(key: string): boolean {
  const k = key.toLowerCase().replace(/[^a-z_]/g, "");
  return FORBIDDEN_KEYS.includes(k);
}

/** Recursively removes private reasoning fields from any backend payload. */
export function redactPrivate<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => redactPrivate(v)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (isForbiddenKey(k)) continue;
      out[k] = redactPrivate(v);
    }
    return out as unknown as T;
  }
  return value;
}

/* --------------------------------------------------------------- taxonomies */

export type RequestState =
  | "QUEUED" | "GATHERING_EVIDENCE" | "REASONING" | "CRITIQUING"
  | "COMPLETED" | "INSUFFICIENT_EVIDENCE" | "ESCALATED" | "FAILED" | "CANCELLED";

export const REQUEST_STATES: RequestState[] = [
  "QUEUED", "GATHERING_EVIDENCE", "REASONING", "CRITIQUING",
  "COMPLETED", "INSUFFICIENT_EVIDENCE", "ESCALATED", "FAILED", "CANCELLED",
];

export const REQUEST_STYLES: Record<RequestState, string> = {
  QUEUED: "border-slate-500/50 bg-slate-500/10 text-slate-300",
  GATHERING_EVIDENCE: "border-sky-500/50 bg-sky-500/10 text-sky-300",
  REASONING: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  CRITIQUING: "border-violet-500/50 bg-violet-500/10 text-violet-300",
  COMPLETED: "border-cyan-500/50 bg-cyan-500/10 text-cyan-300",
  INSUFFICIENT_EVIDENCE: "border-amber-500/60 bg-amber-500/10 text-amber-400",
  ESCALATED: "border-orange-500/60 bg-orange-500/10 text-orange-400",
  FAILED: "border-red-500/60 bg-red-500/10 text-red-400",
  CANCELLED: "border-slate-500/50 bg-slate-500/10 text-slate-400",
};

export type ConclusionStatus =
  | "PROPOSED" | "SUPPORTED" | "CONTESTED" | "REVISED" | "WITHDRAWN"
  | "INSUFFICIENT_EVIDENCE" | "EXPIRED";

export const CONCLUSION_STATUSES: ConclusionStatus[] = [
  "PROPOSED", "SUPPORTED", "CONTESTED", "REVISED", "WITHDRAWN", "INSUFFICIENT_EVIDENCE", "EXPIRED",
];

export const CONCLUSION_STYLES: Record<ConclusionStatus, string> = {
  PROPOSED: "border-sky-500/50 bg-sky-500/10 text-sky-300",
  SUPPORTED: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  CONTESTED: "border-red-500/60 bg-red-500/10 text-red-400",
  REVISED: "border-violet-500/50 bg-violet-500/10 text-violet-300",
  WITHDRAWN: "border-slate-500/50 bg-slate-500/10 text-slate-300",
  INSUFFICIENT_EVIDENCE: "border-amber-500/60 bg-amber-500/10 text-amber-400",
  EXPIRED: "border-orange-500/60 bg-orange-500/10 text-orange-400",
};

/** Reasoning modes WOIC may report as contributing. Labels only. */
export const REASONING_MODES = [
  "DEDUCTIVE", "INDUCTIVE", "ABDUCTIVE", "CAUSAL", "ANALOGICAL",
  "COUNTERFACTUAL", "PROBABILISTIC", "CONSTRAINT", "CRITICAL",
] as const;
export type ReasoningMode = (typeof REASONING_MODES)[number];

export type EvidenceStance = "SUPPORTS" | "CONTRADICTS" | "NEUTRAL" | "UNCLASSIFIED";

export const EVIDENCE_STYLES: Record<EvidenceStance, string> = {
  SUPPORTS: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  CONTRADICTS: "border-red-500/60 bg-red-500/10 text-red-400",
  NEUTRAL: "border-slate-500/50 bg-slate-500/10 text-slate-300",
  UNCLASSIFIED: "border-muted-foreground/40 bg-muted/30 text-muted-foreground",
};

export type ResolutionStatus =
  | "UNRESOLVED" | "UNDER_REVIEW" | "HUMAN_REVIEW_REQUIRED" | "RESOLVED" | "ACCEPTED_CONFLICT";

export const RESOLUTION_STYLES: Record<ResolutionStatus, string> = {
  UNRESOLVED: "border-red-500/60 bg-red-500/10 text-red-400",
  UNDER_REVIEW: "border-amber-500/60 bg-amber-500/10 text-amber-400",
  HUMAN_REVIEW_REQUIRED: "border-orange-500/60 bg-orange-500/10 text-orange-400",
  RESOLVED: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  ACCEPTED_CONFLICT: "border-violet-500/50 bg-violet-500/10 text-violet-300",
};

/** Causal classification is assigned by 6.3A. The workspace only labels it. */
export type CausalClass =
  | "CORRELATION_ONLY" | "POSSIBLE_CAUSAL_RELATION" | "SUPPORTED_CAUSAL_RELATION" | "UNDETERMINED";

export const CAUSAL_CLASSES: CausalClass[] = [
  "CORRELATION_ONLY", "POSSIBLE_CAUSAL_RELATION", "SUPPORTED_CAUSAL_RELATION", "UNDETERMINED",
];

export const CAUSAL_STYLES: Record<CausalClass, string> = {
  CORRELATION_ONLY: "border-slate-500/60 bg-slate-500/10 text-slate-300",
  POSSIBLE_CAUSAL_RELATION: "border-amber-500/60 bg-amber-500/10 text-amber-400",
  SUPPORTED_CAUSAL_RELATION: "border-emerald-500/60 bg-emerald-500/10 text-emerald-400",
  UNDETERMINED: "border-muted-foreground/40 bg-muted/30 text-muted-foreground",
};

export const CAUSAL_MEANING: Record<CausalClass, string> = {
  CORRELATION_ONLY: "Association observed. No causal claim is being made.",
  POSSIBLE_CAUSAL_RELATION: "A causal relation is plausible but not established by the evidence held.",
  SUPPORTED_CAUSAL_RELATION: "Evidence reported by WOIC supports a causal relation. Still not proof.",
  UNDETERMINED: "WOIC did not classify this relation.",
};

export type HypothesisStatus =
  | "OPEN" | "TESTING" | "SUPPORTED" | "REFUTED" | "PARKED" | "INSUFFICIENT_EVIDENCE";

export const HYPOTHESIS_STYLES: Record<HypothesisStatus, string> = {
  OPEN: "border-sky-500/50 bg-sky-500/10 text-sky-300",
  TESTING: "border-violet-500/50 bg-violet-500/10 text-violet-300",
  SUPPORTED: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  REFUTED: "border-red-500/60 bg-red-500/10 text-red-400",
  PARKED: "border-slate-500/50 bg-slate-500/10 text-slate-300",
  INSUFFICIENT_EVIDENCE: "border-amber-500/60 bg-amber-500/10 text-amber-400",
};

function normalize<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  if (value == null) return null;
  const raw = String(value).trim().toUpperCase().replace(/[\s-]+/g, "_");
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : null;
}

export const normalizeRequestState = (v: unknown) => normalize(v, REQUEST_STATES);
export const normalizeConclusion = (v: unknown) => normalize(v, CONCLUSION_STATUSES);
export const normalizeStance = (v: unknown) =>
  normalize(v, ["SUPPORTS", "CONTRADICTS", "NEUTRAL", "UNCLASSIFIED"] as const);
export const normalizeResolution = (v: unknown) =>
  normalize(v, ["UNRESOLVED", "UNDER_REVIEW", "HUMAN_REVIEW_REQUIRED", "RESOLVED", "ACCEPTED_CONFLICT"] as const);
export const normalizeCausal = (v: unknown) => normalize(v, CAUSAL_CLASSES);
export const normalizeHypothesis = (v: unknown) =>
  normalize(v, ["OPEN", "TESTING", "SUPPORTED", "REFUTED", "PARKED", "INSUFFICIENT_EVIDENCE"] as const);
export const normalizeMode = (v: unknown) => normalize(v, REASONING_MODES);

/* ---------------------------------------------------------------- settings */

export interface ReasoningSettings {
  refreshMs: number | false;
  pageSize: number;
}

export const REASONING_SETTINGS_KEY = "iwos.reasoning.settings.v1";

export const DEFAULT_REASONING_SETTINGS: ReasoningSettings = {
  refreshMs: 30_000,
  pageSize: 25,
};

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? ({ ...fallback, ...(JSON.parse(raw) as T) }) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}
