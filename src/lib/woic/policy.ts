// WOIC access policy — pure, no runtime imports.
// Mirror of supabase/functions/_shared/woic-policy.ts; edit both together.
//
// Every WOIC call resolves to (resource, access). Access is granted only when:
//   1. the caller is an active member of the Organization ID (or super_admin),
//   2. one of their roles is allowed for (resource, access), and
//   3. the calling module is allowed to touch that resource.

export type WoicResource =
  | "memory" | "knowledge" | "compliance" | "reasoning" | "decision" | "recommendation"
  | "prediction" | "simulation" | "learning" | "identity" | "context" | "graph"
  | "registry" | "executive" | "communication" | "security" | "events";
export type WoicAccess = "read" | "write";

const ADMIN = ["super_admin", "agency_owner", "agency_admin"];
const STAFF = [
  ...ADMIN, "dispatcher", "recruiter", "account_manager", "scheduler", "onboarding_specialist",
  "compliance_specialist", "payroll", "payroll_specialist", "billing_specialist",
];
const VIEW = [...STAFF, "viewer"];
const COMPLIANCE = [...ADMIN, "compliance_specialist"];

export const WOIC_ROLE_MATRIX: Record<WoicResource, Record<WoicAccess, string[]>> = {
  memory: { read: STAFF, write: ADMIN },
  knowledge: { read: VIEW, write: [...ADMIN, "compliance_specialist", "onboarding_specialist"] },
  compliance: { read: [...COMPLIANCE, "onboarding_specialist", "payroll", "payroll_specialist"], write: COMPLIANCE },
  reasoning: { read: VIEW, write: STAFF },
  decision: { read: VIEW, write: STAFF },
  recommendation: { read: VIEW, write: STAFF },
  prediction: { read: VIEW, write: STAFF },
  simulation: { read: VIEW, write: STAFF },
  learning: { read: VIEW, write: ADMIN },
  identity: { read: VIEW, write: ADMIN },
  context: { read: VIEW, write: STAFF },
  graph: { read: VIEW, write: ADMIN },
  registry: { read: ADMIN, write: ["super_admin"] },
  executive: { read: [...ADMIN, "account_manager"], write: [...ADMIN, "account_manager"] },
  communication: { read: STAFF, write: STAFF },
  security: { read: ADMIN, write: ADMIN },
  events: { read: ADMIN, write: ADMIN },
};

const ALL: WoicResource[] = Object.keys(WOIC_ROLE_MATRIX) as WoicResource[];

/** Which WOIC resources each calling module may use. Unknown modules get nothing. */
export const WOIC_MODULE_SCOPES: Record<string, WoicResource[]> = {
  console: ALL, // WOIC Administration
  cognition: ["reasoning", "decision", "recommendation", "prediction", "simulation", "learning", "context", "memory", "knowledge", "executive"],
  reasoning: ["reasoning", "decision", "recommendation", "prediction", "context", "memory", "knowledge", "graph"],
  knowledge: ["knowledge", "memory", "graph", "reasoning"],
  memory: ["memory", "knowledge", "context", "reasoning"],
  graph: ["graph", "reasoning", "recommendation", "prediction", "knowledge"],
  simulation: ["simulation", "prediction", "reasoning", "context"],
  optimization: ["simulation", "prediction", "recommendation", "reasoning", "context"],
  compliance: ["compliance", "knowledge", "reasoning"],
  comms: ["communication", "context", "memory", "reasoning"],
  recruit: ["recommendation", "prediction", "reasoning"],
  executive: ["executive", "reasoning", "prediction", "context"],
};

export interface WoicPermission { resource: WoicResource; access: WoicAccess }

const EXPLAIN_TARGETS: Record<string, WoicResource> = {
  reasoning: "reasoning", recommendation: "recommendation", decision: "decision",
  prediction: "prediction", simulation: "simulation", security: "security",
};

/** Maps a function + operation (+ params where they change the target) to a permission. */
export function resolveWoicPermission(
  fn: string,
  operation: string,
  params: Record<string, unknown> = {},
): WoicPermission | null {
  const r = (resource: WoicResource, access: WoicAccess = "read"): WoicPermission => ({ resource, access });
  if (fn === "woic-cognitive") {
    switch (operation) {
      case "reason": return r("reasoning", "write");
      case "predict": return r("prediction", "write");
      case "recommend": return r("recommendation", "write");
      case "explain": {
        const t = EXPLAIN_TARGETS[String(params.target_kind ?? "")];
        return t ? r(t) : null;
      }
      case "learn": return r("learning", "write");
      case "retrieve_knowledge": return r("memory");
      case "store_knowledge": return r("memory", "write");
      case "evaluate_compliance": return r("compliance");
      case "generate_report": return r("executive", "write");
      case "generate_communication": return r("communication", "write");
      case "simulate": return r("simulation", "write");
      case "security_scan": return r("security", "write");
      case "snapshot": return r("context");
      default: return null;
    }
  }
  if (fn === "woic-api") {
    const map: Record<string, WoicPermission> = {
      "identity.get": r("identity"),
      "identity.list_memberships": r("identity"),
      "knowledge.search": r("knowledge"),
      "decision.list": r("decision"),
      "recommendation.list": r("recommendation"),
      "compliance.events": r("compliance"),
      "context.get": r("context"),
      "context.set": r("context", "write"),
      "org_memory.upsert": r("memory", "write"),
      "learning.list": r("learning"),
      "prediction.list_models": r("prediction"),
      "prediction.list_results": r("prediction"),
      "registry.services": r("registry"),
      "registry.apis": r("registry"),
    };
    return map[operation] ?? null;
  }
  if (fn === "woic-graph") {
    if (operation === "sync") return r("graph", "write");
    if (operation === "find_compliance_chains") return r("compliance");
    return r("graph");
  }
  if (fn === "woic-recommend") return r("recommendation", "write");
  if (fn === "woic-ingest-events") return r("events", "write");
  if (fn === "woic-conversation-summarize") return r("communication", "write");
  return null;
}

export type WoicDenyReason =
  | "unknown_operation" | "not_agency_member" | "role_not_permitted" | "module_not_permitted";

export function evaluateWoicAccess(input: {
  permission: WoicPermission | null;
  roles: string[];
  isMember: boolean;
  module: string;
}): { allowed: true } | { allowed: false; reason: WoicDenyReason } {
  if (!input.permission) return { allowed: false, reason: "unknown_operation" };
  const isSuper = input.roles.includes("super_admin");
  if (!isSuper && !input.isMember) return { allowed: false, reason: "not_agency_member" };
  const allowedRoles = WOIC_ROLE_MATRIX[input.permission.resource][input.permission.access];
  if (!input.roles.some((role) => allowedRoles.includes(role))) return { allowed: false, reason: "role_not_permitted" };
  const scope = WOIC_MODULE_SCOPES[input.module];
  if (!scope || !scope.includes(input.permission.resource)) return { allowed: false, reason: "module_not_permitted" };
  return { allowed: true };
}
