// WOIC Perception & Context Workspace — client contract.
// Platform Contract PC-6.1B / CapSpec-6.1B / PDNA-6.1B.
//
// This module contains NO perception. No entity resolution, context scoring,
// relevance ranking, salience scoring, contradiction detection, evidence
// evaluation or cognitive reasoning exists in the frontend. It is a typed
// description of the Phase 6.1A Perception & Context API surface plus
// presentation taxonomies. Every operational value rendered by the workspace is
// produced by the backend; when a capability is pending nothing is manufactured.

export const PLATFORM_CONTRACT = "PC-6.1B";
export const CAPABILITY_SPEC = "CapSpec-6.1B";
export const PLATFORM_DNA = "PDNA-6.1B";
export const ARCHITECTURE_VERSION = "IWOS / WOIC v2.0.0-alpha.2";

/** The single Generation Two perception entry point (Phase 6.1A). */
export const PERCEPTION_FUNCTION = "woic-perception";

export type AppRoleLike =
  | "super_admin" | "agency_admin" | "agency_owner" | "dispatcher" | "compliance_specialist";

/* ------------------------------------------------------------- capabilities */

export type PerceptionCapabilityKey =
  | "perception.overview"
  | "observations.list"
  | "observations.get"
  | "context.packs.list"
  | "context.packs.get"
  | "context.composition"
  | "entities.resolutions"
  | "relevance.list"
  | "attention.signals"
  | "contradictions.list"
  | "missing.list"
  | "freshness.list"
  | "sources.health"
  | "privacy.inspect";

export interface CapabilityDef {
  key: PerceptionCapabilityKey;
  label: string;
  description: string;
  /** Method name invoked through the 6.1A Perception & Context API. */
  method: string;
  mutating: boolean;
  roles: AppRoleLike[];
}

export const CAPABILITIES: CapabilityDef[] = [
  { key: "perception.overview", label: "Perception Overview", description: "Aggregated observation volume, coverage, freshness and source health.", method: "perception.overview", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "observations.list", label: "Live Observations", description: "Observation stream with provenance, reliability, freshness and salience.", method: "observations.list", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "observations.get", label: "Observation Detail", description: "One observation, its source record and related entities.", method: "observations.get", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "context.packs.list", label: "Context Packs", description: "Assembled context packs bound to cognitive requests.", method: "context.packs.list", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "context.packs.get", label: "Context Pack Inspector", description: "Entities, observations, evidence, references, coverage and gaps.", method: "context.packs.get", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "context.composition", label: "Context Composition", description: "How a context pack was assembled from platform sources.", method: "context.composition", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "entities.resolutions", label: "Entity Resolution", description: "Raw references mapped to resolved entities, with alternatives.", method: "entities.resolutions", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "relevance.list", label: "Relevance", description: "Items considered for context and whether they were included.", method: "relevance.list", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "attention.signals", label: "Attention Signals", description: "Salient signals with urgency, impact and recommended attention.", method: "attention.signals", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "contradictions.list", label: "Contradictions", description: "Conflicting observations across sources awaiting reconciliation.", method: "contradictions.list", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "missing.list", label: "Missing Information", description: "Declared information gaps and their impact on confidence.", method: "missing.list", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "freshness.list", label: "Context Freshness", description: "Freshness state of context and the requests depending on it.", method: "freshness.list", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "sources.health", label: "Source Health", description: "Availability of every perception source and external adapter.", method: "sources.health", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "privacy.inspect", label: "Privacy Inspector", description: "Permission scope, classification, exclusions and purpose limitation.", method: "privacy.inspect", mutating: false, roles: ["agency_admin", "super_admin"] },
];

export const capabilityByKey = (key: PerceptionCapabilityKey): CapabilityDef =>
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

/* ---------------------------------------------------------------- taxonomies */

export type FreshnessState = "CURRENT" | "AGING" | "STALE" | "EXPIRED" | "UNKNOWN";

export const FRESHNESS_STATES: FreshnessState[] = ["CURRENT", "AGING", "STALE", "EXPIRED", "UNKNOWN"];

export const FRESHNESS_STYLES: Record<FreshnessState, string> = {
  CURRENT: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  AGING: "border-amber-500/50 bg-amber-500/10 text-amber-400",
  STALE: "border-orange-500/60 bg-orange-500/10 text-orange-400",
  EXPIRED: "border-red-500/60 bg-red-500/10 text-red-400",
  UNKNOWN: "border-slate-500/50 bg-slate-500/10 text-slate-300",
};

export type SourceHealthState = "HEALTHY" | "DEGRADED" | "UNAVAILABLE" | "STALE" | "PERMISSION_RESTRICTED" | "UNKNOWN";

export const SOURCE_HEALTH_STATES: SourceHealthState[] = [
  "HEALTHY", "DEGRADED", "UNAVAILABLE", "STALE", "PERMISSION_RESTRICTED", "UNKNOWN",
];

export const SOURCE_HEALTH_STYLES: Record<SourceHealthState, string> = {
  HEALTHY: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  DEGRADED: "border-amber-500/60 bg-amber-500/10 text-amber-400",
  UNAVAILABLE: "border-red-500/60 bg-red-500/10 text-red-400",
  STALE: "border-orange-500/60 bg-orange-500/10 text-orange-400",
  PERMISSION_RESTRICTED: "border-violet-500/50 bg-violet-500/10 text-violet-300",
  UNKNOWN: "border-slate-500/50 bg-slate-500/10 text-slate-300",
};

export type ResolutionState = "RESOLVED" | "AMBIGUOUS" | "UNRESOLVED" | "CONFLICTED" | "UNKNOWN";

export const RESOLUTION_STATES: ResolutionState[] = [
  "RESOLVED", "AMBIGUOUS", "UNRESOLVED", "CONFLICTED", "UNKNOWN",
];

export const RESOLUTION_STYLES: Record<ResolutionState, string> = {
  RESOLVED: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  AMBIGUOUS: "border-amber-500/60 bg-amber-500/10 text-amber-400",
  UNRESOLVED: "border-slate-500/60 bg-slate-500/10 text-slate-300",
  CONFLICTED: "border-red-500/60 bg-red-500/10 text-red-400",
  UNKNOWN: "border-slate-500/50 bg-slate-500/10 text-slate-300",
};

export type SeverityLevel = "info" | "low" | "medium" | "high" | "critical";

export const SEVERITY_STYLES: Record<SeverityLevel, string> = {
  info: "border-sky-500/50 bg-sky-500/10 text-sky-300",
  low: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  medium: "border-amber-500/50 bg-amber-500/10 text-amber-400",
  high: "border-orange-500/60 bg-orange-500/10 text-orange-400",
  critical: "border-red-500/60 bg-red-500/10 text-red-400",
};

/** Perception sources the workspace can display health for (6.1A reports state). */
export const PERCEPTION_SOURCES: Array<{ key: string; label: string; detail: string }> = [
  { key: "event_fabric", label: "Event Fabric", detail: "Universal event stream (Phase 5.1)." },
  { key: "timeline", label: "Timeline", detail: "Universal historical memory (Phase 5.4)." },
  { key: "knowledge", label: "Knowledge", detail: "Organizational knowledge base (Phase 5.5)." },
  { key: "communication", label: "Communication", detail: "Unified communications fabric (Phase 5.6)." },
  { key: "graph", label: "Graph", detail: "Platform graph relationships (Phase 5.7)." },
  { key: "identity", label: "Identity", detail: "WOIC identity and membership records." },
  { key: "decision", label: "Decision", detail: "Recorded decisions and outcomes." },
  { key: "simulation", label: "Simulation", detail: "Scenario projections (Phase 5.8B)." },
  { key: "optimization", label: "Optimization", detail: "Objective solving output (Phase 5.8D)." },
  { key: "external", label: "External Adapters", detail: "Third-party connectors and ingestion adapters." },
];

/** Composition inputs displayed in the context composition view. */
export const COMPOSITION_INPUTS = [
  "Identity", "Timeline", "Knowledge", "Graph", "Communication",
  "Policies", "Simulation", "Optimization",
] as const;

/** Context pack inspector sections, rendered verbatim from backend metadata. */
export const CONTEXT_PACK_SECTIONS: Array<{ key: string; label: string }> = [
  { key: "cognitive_request", label: "Cognitive Request" },
  { key: "primary_entities", label: "Primary Entities" },
  { key: "related_entities", label: "Related Entities" },
  { key: "observations", label: "Observations" },
  { key: "evidence", label: "Evidence" },
  { key: "knowledge_references", label: "Knowledge References" },
  { key: "graph_references", label: "Graph References" },
  { key: "timeline_references", label: "Timeline References" },
  { key: "communication_references", label: "Communication References" },
  { key: "decision_references", label: "Decision References" },
  { key: "simulation_references", label: "Simulation References" },
  { key: "optimization_references", label: "Optimization References" },
  { key: "coverage", label: "Coverage" },
  { key: "freshness", label: "Freshness" },
  { key: "missing_information", label: "Missing Information" },
  { key: "contradictions", label: "Contradictions" },
  { key: "uncertainty", label: "Uncertainty" },
  { key: "estimated_context_size", label: "Estimated Context Size" },
  { key: "expiration", label: "Expiration" },
];

/** Reason categories the backend may report for inclusion/exclusion. */
export const RELEVANCE_DECISIONS = ["included", "excluded"] as const;

/* --------------------------------------------------------- privacy boundary */

/** Keys the workspace must never render, even if a backend leaks them. */
export const FORBIDDEN_KEYS = [
  "chain_of_thought", "chainofthought", "cot", "private_reasoning",
  "raw_reasoning", "scratchpad", "internal_monologue", "hidden_thoughts",
  "restricted_content", "sensitive_payload",
];

export function isForbiddenKey(key: string): boolean {
  const k = key.toLowerCase().replace(/[\s-]/g, "_");
  return FORBIDDEN_KEYS.includes(k);
}

/** Strips private reasoning / restricted payloads before render. */
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

/* ----------------------------------------------------------- normalization */

function upper(value: unknown): string {
  return str(value).toUpperCase().replace(/[\s-]/g, "_");
}

export function normalizeFreshness(value: unknown): FreshnessState | null {
  const v = upper(value);
  return (FRESHNESS_STATES as string[]).includes(v) ? (v as FreshnessState) : null;
}

export function normalizeSourceHealth(value: unknown): SourceHealthState | null {
  const v = upper(value);
  return (SOURCE_HEALTH_STATES as string[]).includes(v) ? (v as SourceHealthState) : null;
}

export function normalizeResolution(value: unknown): ResolutionState | null {
  const v = upper(value);
  return (RESOLUTION_STATES as string[]).includes(v) ? (v as ResolutionState) : null;
}

export function normalizeSeverity(value: unknown): SeverityLevel | null {
  const v = str(value).toLowerCase();
  return (["info", "low", "medium", "high", "critical"] as string[]).includes(v) ? (v as SeverityLevel) : null;
}

/**
 * Scores are displayed only when the backend reported them. The workspace never
 * computes, re-ranks or invents relevance, salience or confidence.
 */
export function scorePercent(value: unknown): number | null {
  const n = num(value);
  if (n == null) return null;
  const pct = n <= 1 ? n * 100 : n;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

export function formatTime(value: unknown): string {
  const raw = str(value);
  if (!raw) return "—";
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? raw : d.toLocaleString();
}

/* ------------------------------------------------------------------ settings */

export interface PerceptionSettings {
  refreshMs: number;
  pageSize: number;
  streamPaused: boolean;
  density: "comfortable" | "dense";
}

export const DEFAULT_PERCEPTION_SETTINGS: PerceptionSettings = {
  refreshMs: 15000,
  pageSize: 25,
  streamPaused: false,
  density: "dense",
};

export const PERCEPTION_SETTINGS_KEY = "iwos.perception.settings.v1";
export const PERCEPTION_PINS_KEY = "iwos.perception.pins.v1";

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
