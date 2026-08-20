// WOIC Cognitive Memory Workspace — client contract.
// Platform Contract PC-6.2B / CapSpec-6.2B / PDNA-6.2B.
//
// This module contains NO working-memory engine. No compression, eviction,
// scoring, checkpoint persistence, state merging or memory promotion happens in
// the frontend. It is a typed description of the Phase 6.2A Working Memory API
// surface plus presentation taxonomies. Every operational value rendered by the
// workspace is produced by the backend; when a capability is pending nothing is
// manufactured.

export const PLATFORM_CONTRACT = "PC-6.2B";
export const CAPABILITY_SPEC = "CapSpec-6.2B";
export const PLATFORM_DNA = "PDNA-6.2B";
export const ARCHITECTURE_VERSION = "IWOS / WOIC v2.0.0-alpha.3";

/** The single Generation Two working-memory entry point (Phase 6.2A). */
export const MEMORY_FUNCTION = "woic-memory";

export type AppRoleLike =
  | "super_admin" | "agency_admin" | "agency_owner" | "dispatcher" | "compliance_specialist";

/* ------------------------------------------------------------- capabilities */

export type MemoryCapabilityKey =
  | "memory.overview"
  | "memory.sessions.list"
  | "memory.sessions.get"
  | "memory.state.get"
  | "memory.items.list"
  | "memory.goals.list"
  | "memory.questions.list"
  | "memory.hypotheses.list"
  | "memory.evidence.list"
  | "memory.checkpoints.list"
  | "memory.compression.list"
  | "memory.lifecycle.list"
  | "memory.budgets.get"
  | "memory.health.get"
  // governed operator controls — executed by 6.2A, never locally
  | "memory.session.pause"
  | "memory.session.resume"
  | "memory.session.close"
  | "memory.checkpoint.create"
  | "memory.checkpoint.restore"
  | "memory.context.refresh"
  | "memory.review.request";

export interface CapabilityDef {
  key: MemoryCapabilityKey;
  label: string;
  description: string;
  /** Method name invoked through the 6.2A Working Memory API. */
  method: string;
  mutating: boolean;
  roles: AppRoleLike[];
}

const READ_ROLES: AppRoleLike[] = ["agency_admin", "super_admin"];
const WRITE_ROLES: AppRoleLike[] = ["agency_admin", "super_admin"];

export const CAPABILITIES: CapabilityDef[] = [
  { key: "memory.overview", label: "Memory Overview", description: "Aggregated working-memory utilization, compression, eviction and health.", method: "memory.overview", mutating: false, roles: READ_ROLES },
  { key: "memory.sessions.list", label: "Active Sessions", description: "Cognitive sessions currently holding working memory.", method: "memory.sessions.list", mutating: false, roles: READ_ROLES },
  { key: "memory.sessions.get", label: "Session Detail", description: "One cognitive session with its memory, budget and checkpoint state.", method: "memory.sessions.get", mutating: false, roles: READ_ROLES },
  { key: "memory.state.get", label: "Cognitive State", description: "Structured session state: goals, claims, questions, constraints, budget.", method: "memory.state.get", mutating: false, roles: READ_ROLES },
  { key: "memory.items.list", label: "Memory Items", description: "Individual working-memory items with retention class and status.", method: "memory.items.list", mutating: false, roles: READ_ROLES },
  { key: "memory.goals.list", label: "Goals & Subgoals", description: "Goal decomposition reported by WOIC, with dependencies and blockers.", method: "memory.goals.list", mutating: false, roles: READ_ROLES },
  { key: "memory.questions.list", label: "Open Questions", description: "Unresolved questions with affected claims and responsible faculty.", method: "memory.questions.list", mutating: false, roles: READ_ROLES },
  { key: "memory.hypotheses.list", label: "Hypotheses", description: "Active hypotheses with supporting and contradicting evidence.", method: "memory.hypotheses.list", mutating: false, roles: READ_ROLES },
  { key: "memory.evidence.list", label: "Evidence", description: "Evidence retained in working memory and what it supports.", method: "memory.evidence.list", mutating: false, roles: READ_ROLES },
  { key: "memory.checkpoints.list", label: "Checkpoints", description: "Persisted cognitive state checkpoints and their status.", method: "memory.checkpoints.list", mutating: false, roles: READ_ROLES },
  { key: "memory.compression.list", label: "Compression", description: "Compression events with ratio, collapsed items and preserved provenance.", method: "memory.compression.list", mutating: false, roles: READ_ROLES },
  { key: "memory.lifecycle.list", label: "Memory Lifecycle", description: "Lifecycle transitions across created, compressed, evicted and promoted.", method: "memory.lifecycle.list", mutating: false, roles: READ_ROLES },
  { key: "memory.budgets.get", label: "Budgets", description: "Token, memory, compute, tool, retrieval, simulation and time budgets.", method: "memory.budgets.get", mutating: false, roles: READ_ROLES },
  { key: "memory.health.get", label: "Memory Health", description: "Capacity pressure, staleness, conflicts, checkpoint and promotion errors.", method: "memory.health.get", mutating: false, roles: READ_ROLES },

  { key: "memory.session.pause", label: "Pause Session", description: "Ask WOIC to pause a cognitive session.", method: "memory.session.pause", mutating: true, roles: WRITE_ROLES },
  { key: "memory.session.resume", label: "Resume Session", description: "Ask WOIC to resume a paused cognitive session.", method: "memory.session.resume", mutating: true, roles: WRITE_ROLES },
  { key: "memory.session.close", label: "Close Session", description: "Ask WOIC to close a cognitive session and release working memory.", method: "memory.session.close", mutating: true, roles: WRITE_ROLES },
  { key: "memory.checkpoint.create", label: "Create Checkpoint", description: "Request a backend-persisted checkpoint of current cognitive state.", method: "memory.checkpoint.create", mutating: true, roles: WRITE_ROLES },
  { key: "memory.checkpoint.restore", label: "Restore Checkpoint", description: "Request backend restoration of a checkpoint. Never performed locally.", method: "memory.checkpoint.restore", mutating: true, roles: ["super_admin"] },
  { key: "memory.context.refresh", label: "Request Context Refresh", description: "Ask perception to refresh context feeding a session.", method: "memory.context.refresh", mutating: true, roles: WRITE_ROLES },
  { key: "memory.review.request", label: "Request Cognitive Review", description: "Escalate a session for human cognitive review.", method: "memory.review.request", mutating: true, roles: WRITE_ROLES },
];

export const capabilityByKey = (key: MemoryCapabilityKey): CapabilityDef =>
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

/** Working-memory lifecycle. Deletion (eviction/expiry) is never conflated with promotion. */
export type LifecycleState =
  | "CREATED" | "ACTIVE" | "COMPRESSED" | "SUPERSEDED" | "EVICTED" | "EXPIRED" | "PROMOTED" | "CLOSED";

export const LIFECYCLE_STATES: LifecycleState[] = [
  "CREATED", "ACTIVE", "COMPRESSED", "SUPERSEDED", "EVICTED", "EXPIRED", "PROMOTED", "CLOSED",
];

export const LIFECYCLE_STYLES: Record<LifecycleState, string> = {
  CREATED: "border-sky-500/50 bg-sky-500/10 text-sky-300",
  ACTIVE: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  COMPRESSED: "border-violet-500/50 bg-violet-500/10 text-violet-300",
  SUPERSEDED: "border-amber-500/50 bg-amber-500/10 text-amber-400",
  EVICTED: "border-red-500/60 bg-red-500/10 text-red-400",
  EXPIRED: "border-orange-500/60 bg-orange-500/10 text-orange-400",
  PROMOTED: "border-cyan-500/60 bg-cyan-500/10 text-cyan-300",
  CLOSED: "border-slate-500/50 bg-slate-500/10 text-slate-300",
};

/** Whether a lifecycle state removes the item from the system or preserves it elsewhere. */
export const LIFECYCLE_DISPOSITION: Record<LifecycleState, "retained" | "removed" | "preserved"> = {
  CREATED: "retained",
  ACTIVE: "retained",
  COMPRESSED: "retained",
  SUPERSEDED: "retained",
  EVICTED: "removed",
  EXPIRED: "removed",
  PROMOTED: "preserved",
  CLOSED: "retained",
};

export const LIFECYCLE_MEANING: Record<LifecycleState, string> = {
  CREATED: "Item entered working memory.",
  ACTIVE: "Item is held in active working memory.",
  COMPRESSED: "Item was collapsed into a structured summary; provenance retained by WOIC.",
  SUPERSEDED: "A newer item replaced this one within the session.",
  EVICTED: "Item was removed from working memory under capacity pressure. Not promoted.",
  EXPIRED: "Item passed its retention window and was removed. Not promoted.",
  PROMOTED: "Item was written to durable long-term memory. Not a deletion.",
  CLOSED: "The owning session ended and its memory was released.",
};

export type SessionState = "ACTIVE" | "WAITING" | "PAUSED" | "BLOCKED" | "ESCALATED" | "CLOSED" | "FAILED";

export const SESSION_STATES: SessionState[] = [
  "ACTIVE", "WAITING", "PAUSED", "BLOCKED", "ESCALATED", "CLOSED", "FAILED",
];

export const SESSION_STYLES: Record<SessionState, string> = {
  ACTIVE: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  WAITING: "border-sky-500/50 bg-sky-500/10 text-sky-300",
  PAUSED: "border-slate-500/50 bg-slate-500/10 text-slate-300",
  BLOCKED: "border-amber-500/60 bg-amber-500/10 text-amber-400",
  ESCALATED: "border-violet-500/60 bg-violet-500/10 text-violet-300",
  CLOSED: "border-slate-500/50 bg-slate-500/10 text-slate-300",
  FAILED: "border-red-500/60 bg-red-500/10 text-red-400",
};

export type GoalState = "ACTIVE" | "COMPLETED" | "BLOCKED" | "WAITING" | "ABANDONED" | "PLANNED";

export const GOAL_STYLES: Record<GoalState, string> = {
  ACTIVE: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  COMPLETED: "border-cyan-500/50 bg-cyan-500/10 text-cyan-300",
  BLOCKED: "border-red-500/60 bg-red-500/10 text-red-400",
  WAITING: "border-amber-500/60 bg-amber-500/10 text-amber-400",
  ABANDONED: "border-slate-500/50 bg-slate-500/10 text-slate-300",
  PLANNED: "border-sky-500/50 bg-sky-500/10 text-sky-300",
};

export type HypothesisState = "OPEN" | "SUPPORTED" | "CONTRADICTED" | "REJECTED" | "CONFIRMED" | "UNKNOWN";

export const HYPOTHESIS_STYLES: Record<HypothesisState, string> = {
  OPEN: "border-sky-500/50 bg-sky-500/10 text-sky-300",
  SUPPORTED: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  CONTRADICTED: "border-amber-500/60 bg-amber-500/10 text-amber-400",
  REJECTED: "border-red-500/60 bg-red-500/10 text-red-400",
  CONFIRMED: "border-cyan-500/60 bg-cyan-500/10 text-cyan-300",
  UNKNOWN: "border-slate-500/50 bg-slate-500/10 text-slate-300",
};

export type CheckpointState = "AVAILABLE" | "CREATING" | "RESTORING" | "STALE" | "FAILED" | "UNKNOWN";

export const CHECKPOINT_STYLES: Record<CheckpointState, string> = {
  AVAILABLE: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  CREATING: "border-sky-500/50 bg-sky-500/10 text-sky-300",
  RESTORING: "border-violet-500/60 bg-violet-500/10 text-violet-300",
  STALE: "border-amber-500/60 bg-amber-500/10 text-amber-400",
  FAILED: "border-red-500/60 bg-red-500/10 text-red-400",
  UNKNOWN: "border-slate-500/50 bg-slate-500/10 text-slate-300",
};

export type RetentionClass = "EPHEMERAL" | "SESSION" | "DURABLE" | "PROMOTABLE" | "PINNED" | "UNKNOWN";

export const RETENTION_STYLES: Record<RetentionClass, string> = {
  EPHEMERAL: "border-slate-500/50 bg-slate-500/10 text-slate-300",
  SESSION: "border-sky-500/50 bg-sky-500/10 text-sky-300",
  DURABLE: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  PROMOTABLE: "border-cyan-500/60 bg-cyan-500/10 text-cyan-300",
  PINNED: "border-violet-500/60 bg-violet-500/10 text-violet-300",
  UNKNOWN: "border-slate-500/50 bg-slate-500/10 text-slate-300",
};

/** Budget dimensions the workspace can render when 6.2A reports them. */
export const BUDGET_DIMENSIONS: Array<{ key: string; label: string; detail: string }> = [
  { key: "token", label: "Token Budget", detail: "Model tokens allocated to the session." },
  { key: "memory", label: "Memory Capacity", detail: "Working-memory capacity allocated to the session." },
  { key: "compute", label: "Compute Budget", detail: "Compute units available to faculties." },
  { key: "tool", label: "Tool Budget", detail: "Tool invocations available." },
  { key: "retrieval", label: "Retrieval Budget", detail: "Retrieval operations available." },
  { key: "simulation", label: "Simulation Budget", detail: "Simulation runs available." },
  { key: "optimization", label: "Optimization Budget", detail: "Optimization solves available." },
  { key: "time", label: "Time Budget", detail: "Wall-clock time allocated." },
  { key: "cost", label: "Cost", detail: "Monetary cost accrued against the allocation." },
];

/** Health signals rendered on the Memory Health page. */
export const HEALTH_SIGNALS: Array<{ key: string; label: string; detail: string }> = [
  { key: "capacity_pressure", label: "Capacity Pressure", detail: "Working memory approaching allocated capacity." },
  { key: "stale_memory", label: "Stale Memory", detail: "Items whose context is no longer current." },
  { key: "conflict_rate", label: "Conflict Rate", detail: "Contradictory items held simultaneously." },
  { key: "failed_checkpoints", label: "Failed Checkpoints", detail: "Checkpoint persistence failures." },
  { key: "restore_failures", label: "Restore Failures", detail: "Checkpoint restoration failures." },
  { key: "concurrency_conflicts", label: "Concurrency Conflicts", detail: "Competing writers to one session state." },
  { key: "expired_items", label: "Expired Items", detail: "Items removed after their retention window." },
  { key: "budget_pressure", label: "Budget Pressure", detail: "Sessions near a budget threshold." },
  { key: "promotion_errors", label: "Promotion Errors", detail: "Failures writing items to long-term memory." },
];

/* --------------------------------------------------------------- redaction */

/** Keys that may carry private chain-of-thought. Never rendered. */
const FORBIDDEN_KEYS = [
  "chain_of_thought", "chainofthought", "cot", "raw_reasoning", "private_reasoning",
  "internal_monologue", "scratchpad", "hidden_state", "raw_prompt", "system_prompt",
  "model_thoughts", "thoughts", "deliberation_trace",
];

export function isForbiddenKey(key: string): boolean {
  const k = key.toLowerCase().replace(/[\s-]/g, "_");
  return FORBIDDEN_KEYS.includes(k);
}

/** Strips private reasoning payloads before render. */
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

function pick<T extends string>(states: readonly T[], value: unknown): T | null {
  const v = upper(value);
  return (states as readonly string[]).includes(v) ? (v as T) : null;
}

export const normalizeLifecycle = (v: unknown) => pick(LIFECYCLE_STATES, v);
export const normalizeSession = (v: unknown) => pick(SESSION_STATES, v);
export const normalizeGoal = (v: unknown) => pick(Object.keys(GOAL_STYLES) as GoalState[], v);
export const normalizeHypothesis = (v: unknown) => pick(Object.keys(HYPOTHESIS_STYLES) as HypothesisState[], v);
export const normalizeCheckpoint = (v: unknown) => pick(Object.keys(CHECKPOINT_STYLES) as CheckpointState[], v);
export const normalizeRetention = (v: unknown) => pick(Object.keys(RETENTION_STYLES) as RetentionClass[], v);

/** Percentages are displayed only when the backend reported them. */
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

export function formatBytes(value: unknown): string {
  const n = num(value);
  if (n == null) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1; }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function formatCost(value: unknown): string {
  const n = num(value);
  return n == null ? "—" : `$${n.toFixed(2)}`;
}

/* ------------------------------------------------------------------ settings */

export interface MemorySettings {
  refreshMs: number;
  pageSize: number;
  density: "comfortable" | "dense";
}

export const DEFAULT_MEMORY_SETTINGS: MemorySettings = {
  refreshMs: 15000,
  pageSize: 25,
  density: "dense",
};

export const MEMORY_SETTINGS_KEY = "iwos.memory.settings.v1";

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
