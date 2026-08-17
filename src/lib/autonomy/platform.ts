// Autonomous Operations Workspace — client contract (PC-5.9B / CapSpec-5.9B / PDNA-5.9B).
//
// This module contains NO coordination logic. It is a typed description of the
// Autonomous Coordination Engine (Phase 5.9A) surface plus presentation
// taxonomies. Every operational value rendered by the workspace is returned by
// the backend engine; nothing here computes, schedules, authorises or executes.

export const PLATFORM_CONTRACT = "PC-5.9B";
export const CAPABILITY_SPEC = "CapSpec-5.9B";
export const PLATFORM_DNA = "PDNA-5.9B";
export const ARCHITECTURE_VERSION = "IWOS v1.5.0";
export const CONSTITUTION_VERSION = "v1.0";

/** The single backend entry point for autonomous coordination (5.9A). */
export const AUTONOMY_ENGINE_FUNCTION = "autonomy-api";

/* ------------------------------------------------------------- capabilities */

export type AutonomyCapabilityKey =
  | "operations.overview"
  | "coordinations.list"
  | "coordinations.detail"
  | "objectives.list"
  | "plans.list"
  | "tasks.list"
  | "actors.list"
  | "authority.list"
  | "authority.mutate"
  | "approvals.list"
  | "approvals.decide"
  | "interventions.list"
  | "interventions.execute"
  | "killswitch.status"
  | "killswitch.activate"
  | "escalations.list"
  | "ledger.query"
  | "performance.metrics"
  | "incidents.list";

export interface CapabilityDef {
  key: AutonomyCapabilityKey;
  label: string;
  description: string;
  /** Engine method name invoked through the 5.9A API. */
  method: string;
  /** Whether the capability mutates governed state (requires confirmation). */
  mutating: boolean;
  /** Roles the frontend requires before even offering the control. */
  roles: AppRoleLike[];
}

export type AppRoleLike = "super_admin" | "agency_admin" | "agency_owner" | "dispatcher" | "compliance_specialist";

export const CAPABILITIES: CapabilityDef[] = [
  { key: "operations.overview", label: "Operations Overview", description: "Aggregated autonomy health, counts and summaries.", method: "operations.overview", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "coordinations.list", label: "Live Coordinations", description: "Active coordination sessions with status and risk.", method: "coordinations.list", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "coordinations.detail", label: "Coordination Detail", description: "Objective → plan → workstream → task → actor drill-down.", method: "coordinations.get", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "objectives.list", label: "Objectives", description: "Autonomous objectives, owners and success criteria.", method: "objectives.list", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "plans.list", label: "Plans", description: "Engine-produced plans and their references.", method: "plans.list", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "tasks.list", label: "Tasks", description: "Task execution state across coordinations.", method: "tasks.list", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "actors.list", label: "Actors", description: "Humans, agents, automations, organisms, robots and equipment.", method: "actors.list", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "authority.list", label: "Authority Envelopes", description: "Delegated authority envelopes and their scopes.", method: "authority.list", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "authority.mutate", label: "Authority Change", description: "Grant, reduce, revoke or expire delegated authority.", method: "authority.mutate", mutating: true, roles: ["super_admin"] },
  { key: "approvals.list", label: "Approval Queue", description: "Actions awaiting human approval.", method: "approvals.list", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "approvals.decide", label: "Approval Decision", description: "Approve, reject, modify, escalate or request information.", method: "approvals.decide", mutating: true, roles: ["agency_admin", "super_admin"] },
  { key: "interventions.list", label: "Intervention History", description: "Human interventions recorded by the engine.", method: "interventions.list", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "interventions.execute", label: "Intervention", description: "Pause, resume, cancel, reassign, rollback or re-plan.", method: "interventions.execute", mutating: true, roles: ["agency_admin", "super_admin"] },
  { key: "killswitch.status", label: "Kill-Switch Status", description: "Scope-level kill-switch state and activation history.", method: "killswitch.status", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "killswitch.activate", label: "Kill-Switch Activation", description: "Halt autonomous activity for a governed scope.", method: "killswitch.activate", mutating: true, roles: ["super_admin"] },
  { key: "escalations.list", label: "Escalations", description: "Escalated operations awaiting human judgement.", method: "escalations.list", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "ledger.query", label: "Autonomy Ledger", description: "Governance chain audit history.", method: "ledger.query", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "performance.metrics", label: "Performance", description: "Autonomy performance and accuracy metrics.", method: "performance.metrics", mutating: false, roles: ["agency_admin", "super_admin"] },
  { key: "incidents.list", label: "Incidents", description: "Failures, violations, rollbacks and safety interruptions.", method: "incidents.list", mutating: false, roles: ["agency_admin", "super_admin"] },
];

export const capabilityByKey = (key: AutonomyCapabilityKey): CapabilityDef =>
  CAPABILITIES.find((c) => c.key === key) ?? {
    key, label: key, description: "", method: key, mutating: false, roles: ["super_admin"],
  };

/* ---------------------------------------------------------------- taxonomies */

export type OperationState =
  | "PLANNED" | "APPROVED" | "EXECUTING" | "COMPLETED"
  | "FAILED" | "PAUSED" | "ESCALATED" | "ROLLED_BACK";

export const OPERATION_STATES: OperationState[] = [
  "PLANNED", "APPROVED", "EXECUTING", "COMPLETED", "FAILED", "PAUSED", "ESCALATED", "ROLLED_BACK",
];

export const STATE_STYLES: Record<OperationState, string> = {
  PLANNED: "border-slate-500/50 bg-slate-500/10 text-slate-300",
  APPROVED: "border-sky-500/50 bg-sky-500/10 text-sky-400",
  EXECUTING: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  COMPLETED: "border-emerald-700/50 bg-emerald-700/10 text-emerald-300",
  FAILED: "border-red-500/60 bg-red-500/10 text-red-400",
  PAUSED: "border-amber-500/50 bg-amber-500/10 text-amber-400",
  ESCALATED: "border-orange-500/60 bg-orange-500/10 text-orange-400",
  ROLLED_BACK: "border-fuchsia-500/50 bg-fuchsia-500/10 text-fuchsia-400",
};

export type RiskLevel = "low" | "medium" | "high" | "critical";

export const RISK_STYLES: Record<RiskLevel, string> = {
  low: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  medium: "border-amber-500/50 bg-amber-500/10 text-amber-400",
  high: "border-orange-500/60 bg-orange-500/10 text-orange-400",
  critical: "border-red-500/60 bg-red-500/10 text-red-400",
};

export type ActorType =
  | "human" | "ai_agent" | "automation" | "platform_organism" | "robot" | "equipment" | "external_system";

export const ACTOR_TYPES: Array<{ key: ActorType; label: string; autonomous: boolean }> = [
  { key: "human", label: "Human", autonomous: false },
  { key: "ai_agent", label: "AI Agent", autonomous: true },
  { key: "automation", label: "Automation", autonomous: true },
  { key: "platform_organism", label: "Platform Organism", autonomous: true },
  { key: "robot", label: "Robot", autonomous: true },
  { key: "equipment", label: "Equipment", autonomous: true },
  { key: "external_system", label: "External System", autonomous: true },
];

export const actorTypeLabel = (t: string) =>
  ACTOR_TYPES.find((a) => a.key === t)?.label ?? t;

export const isAutonomousActor = (t: string) =>
  ACTOR_TYPES.find((a) => a.key === t)?.autonomous ?? true;

/** Delegated authority ladder, lowest to highest. */
export const AUTHORITY_LEVELS = [
  { key: "observe", label: "Observe", detail: "Read-only. No action may be taken." },
  { key: "recommend", label: "Recommend", detail: "May propose actions for human decision." },
  { key: "act_with_approval", label: "Act with approval", detail: "May execute only after human approval." },
  { key: "act_bounded", label: "Act within envelope", detail: "May execute inside a bounded authority envelope." },
  { key: "act_autonomous", label: "Autonomous", detail: "May execute and delegate within contract limits." },
] as const;

export type AuthorityLevel = typeof AUTHORITY_LEVELS[number]["key"];

export const authorityLabel = (k: string) =>
  AUTHORITY_LEVELS.find((a) => a.key === k)?.label ?? k;

/* ------------------------------------------------------- intervention matrix */

export type InterventionKind =
  | "pause" | "resume" | "cancel" | "reassign_task" | "reduce_authority" | "revoke_authority"
  | "request_reoptimization" | "request_resimulation" | "escalate" | "rollback" | "kill_switch";

export interface InterventionDef {
  kind: InterventionKind;
  label: string;
  /** Plain-language consequence shown before confirmation. */
  consequence: string;
  danger: "normal" | "elevated" | "emergency";
  capability: AutonomyCapabilityKey;
  roles: AppRoleLike[];
  /** Confirmation phrase required for emergency controls. */
  confirmPhrase?: string;
}

export const INTERVENTIONS: InterventionDef[] = [
  { kind: "pause", label: "Pause operation", consequence: "All running tasks in this coordination stop at their next safe checkpoint. Nothing is cancelled and no work is lost.", danger: "normal", capability: "interventions.execute", roles: ["agency_admin", "super_admin"] },
  { kind: "resume", label: "Resume operation", consequence: "Paused tasks resume under their existing authority envelope and approvals.", danger: "normal", capability: "interventions.execute", roles: ["agency_admin", "super_admin"] },
  { kind: "reassign_task", label: "Reassign task", consequence: "The task is removed from its current actor and re-queued for assignment by the engine.", danger: "normal", capability: "interventions.execute", roles: ["agency_admin", "super_admin"] },
  { kind: "request_reoptimization", label: "Request re-optimization", consequence: "The plan is returned to the Optimization Engine. The current plan stays in force until a new plan is approved.", danger: "normal", capability: "interventions.execute", roles: ["agency_admin", "super_admin"] },
  { kind: "request_resimulation", label: "Request re-simulation", consequence: "A projection is generated in the Simulation Workspace. Production state is not affected.", danger: "normal", capability: "interventions.execute", roles: ["agency_admin", "super_admin"] },
  { kind: "escalate", label: "Escalate", consequence: "The operation is routed to a higher approval authority and pauses pending judgement.", danger: "normal", capability: "interventions.execute", roles: ["agency_admin", "super_admin"] },
  { kind: "reduce_authority", label: "Reduce authority", consequence: "The actor's authority level is lowered. Actions above the new level will require approval.", danger: "elevated", capability: "authority.mutate", roles: ["super_admin"] },
  { kind: "revoke_authority", label: "Revoke authority", consequence: "All delegated authority is withdrawn from the actor. Every in-flight action it owns stops immediately.", danger: "elevated", capability: "authority.mutate", roles: ["super_admin"] },
  { kind: "cancel", label: "Cancel operation", consequence: "The coordination is terminated. Completed work remains, in-flight work is abandoned and the objective is marked unmet.", danger: "elevated", capability: "interventions.execute", roles: ["agency_admin", "super_admin"] },
  { kind: "rollback", label: "Governed rollback", consequence: "The engine reverses completed actions where reversal is defined. Irreversible actions are listed and remain in effect.", danger: "emergency", capability: "interventions.execute", roles: ["super_admin"], confirmPhrase: "ROLLBACK" },
  { kind: "kill_switch", label: "Activate kill switch", consequence: "All autonomous activity in the selected scope halts immediately. Recovery requires an explicit authorized restart.", danger: "emergency", capability: "killswitch.activate", roles: ["super_admin"], confirmPhrase: "HALT" },
];

export const interventionByKind = (k: InterventionKind) =>
  INTERVENTIONS.find((i) => i.kind === k) ?? INTERVENTIONS[0];

export type KillScope = "actor" | "coordination" | "domain" | "tenant" | "global";

export const KILL_SCOPES: Array<{ key: KillScope; label: string; detail: string; roles: AppRoleLike[] }> = [
  { key: "actor", label: "Actor", detail: "Halts one autonomous actor.", roles: ["agency_admin", "super_admin"] },
  { key: "coordination", label: "Coordination", detail: "Halts every task in one coordination.", roles: ["agency_admin", "super_admin"] },
  { key: "domain", label: "Platform domain", detail: "Halts autonomy across a whole platform domain.", roles: ["super_admin"] },
  { key: "tenant", label: "Tenant", detail: "Halts all autonomy for this organization.", roles: ["super_admin"] },
  { key: "global", label: "Global", detail: "Halts autonomous coordination platform-wide.", roles: ["super_admin"] },
];

/* ------------------------------------------------------------------ modes */

export type WorkspaceMode = "executive" | "operator" | "engineering";

export const WORKSPACE_MODES: Array<{ key: WorkspaceMode; label: string }> = [
  { key: "executive", label: "Executive" },
  { key: "operator", label: "Operator" },
  { key: "engineering", label: "Engineering" },
];

export interface AutonomySettings {
  mode: WorkspaceMode;
  refreshMs: number;
  density: "comfortable" | "dense";
}

export const DEFAULT_AUTONOMY_SETTINGS: AutonomySettings = {
  mode: "operator",
  refreshMs: 15000,
  density: "dense",
};

export const AUTONOMY_SETTINGS_KEY = "iwos.autonomy.settings.v1";

/* ------------------------------------------------------------- local store */

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
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
  return value == null ? fallback : String(value);
}

export function num(value: unknown): number | null {
  const n = Number(value);
  return value == null || Number.isNaN(n) ? null : n;
}

export function normalizeState(value: unknown): OperationState | null {
  const v = str(value).toUpperCase().replace(/[\s-]/g, "_");
  return (OPERATION_STATES as string[]).includes(v) ? (v as OperationState) : null;
}

export function normalizeRisk(value: unknown): RiskLevel | null {
  const v = str(value).toLowerCase();
  return (["low", "medium", "high", "critical"] as string[]).includes(v) ? (v as RiskLevel) : null;
}

/** Governance chain rendered by the Autonomy Ledger. */
export const GOVERNANCE_CHAIN = [
  "Constitution", "Contract", "Authority", "Decision", "Approval", "Action", "Outcome",
] as const;
