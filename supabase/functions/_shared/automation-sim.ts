// COPY of src/lib/automation/simulate.ts — keep in sync (used by ttos-dispatch so simulations match the engine).

export type Condition = { field?: string; operator?: string; value?: unknown; joiner?: "and" | "or" | "not" };
export type SimContext = {
  event: { name: string; module?: string; entity_type?: string | null; entity_id?: string | null };
  payload: Record<string, unknown>;
  actor?: Record<string, unknown>;
  ai?: Record<string, unknown>;
};
export type ConditionResult = { field: string; operator: string; expected: unknown; actual: unknown; matched: boolean; joiner: string };
export type PlannedAction = {
  index: number;
  type: string;
  outcome: "execute" | "await_approval" | "unsupported";
  summary: string;
  details: Record<string, unknown>;
};
export type ResultingEvent = { name: string; source: string };
export type SimRule = { id?: string; name?: string; trigger_event: string; conditions?: unknown; actions?: unknown; enabled?: boolean };
export type SimulationResult = {
  triggerMatched: boolean;
  conditions: ConditionResult[];
  conditionsPassed: boolean;
  willRun: boolean;
  actions: PlannedAction[];
  resultingEvents: ResultingEvent[];
  cascades: { event: string; rules: string[] }[];
};

export const SENSITIVE = new Set(["launch_drug_test", "generate_payroll", "escalate_issue"]);
const SUPPORTED = new Set(["notify", "create_task", "emit_event"]);

export function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
}

function num(v: unknown) { const n = Number(v); return Number.isFinite(n) ? n : NaN; }
function time(v: unknown) { const t = new Date(String(v)).getTime(); return Number.isFinite(t) ? t : NaN; }

export function evalOperator(op: string, actual: unknown, expected: unknown): boolean {
  switch (op) {
    case "eq": return String(actual ?? "") === String(expected ?? "");
    case "neq": return String(actual ?? "") !== String(expected ?? "");
    case "gt": return num(actual) > num(expected);
    case "gte": return num(actual) >= num(expected);
    case "lt": return num(actual) < num(expected);
    case "lte": return num(actual) <= num(expected);
    case "in": {
      const list = Array.isArray(expected) ? expected.map(String) : String(expected ?? "").split(",").map((s) => s.trim());
      return list.includes(String(actual ?? ""));
    }
    case "contains":
      return Array.isArray(actual) ? actual.map(String).includes(String(expected)) : String(actual ?? "").includes(String(expected ?? ""));
    case "before": return time(actual) < time(expected);
    case "after": return time(actual) > time(expected);
    case "matches": try { return new RegExp(String(expected ?? "")).test(String(actual ?? "")); } catch { return false; }
    case "exists": return actual !== undefined && actual !== null && actual !== "";
    default: return false;
  }
}

/** Conditions are evaluated left to right; joiner applies to the condition it sits on ("and" default, "or", "not" = and-not). */
export function evaluateConditions(conditions: unknown, ctx: SimContext): { results: ConditionResult[]; passed: boolean } {
  const list = Array.isArray(conditions) ? (conditions as Condition[]) : [];
  let passed = true;
  const results: ConditionResult[] = list.map((c, i) => {
    const field = String(c.field ?? "");
    const operator = String(c.operator ?? "eq");
    const actual = getPath(ctx, field);
    const matched = evalOperator(operator, actual, c.value);
    const joiner = c.joiner ?? "and";
    if (i === 0) passed = joiner === "not" ? !matched : matched;
    else if (joiner === "or") passed = passed || matched;
    else if (joiner === "not") passed = passed && !matched;
    else passed = passed && matched;
    return { field, operator, expected: c.value, actual, matched, joiner };
  });
  return { results, passed };
}

export function triggerMatches(trigger: string, eventName: string) {
  return trigger === "*" || trigger === eventName;
}

export function planActions(actions: unknown, ctx: SimContext): PlannedAction[] {
  const list = Array.isArray(actions) ? (actions as Record<string, unknown>[]) : [];
  return list.map((a, index) => {
    const type = String(a.type ?? "");
    if (SENSITIVE.has(type)) {
      return { index, type, outcome: "await_approval", summary: `Queued for approval — will not run until an authorised person approves`, details: a };
    }
    if (!SUPPORTED.has(type)) return { index, type, outcome: "unsupported", summary: "Engine does not run this action type (skipped)", details: a };
    if (type === "notify") {
      return { index, type, outcome: "execute", summary: `Notify ${a.recipient_id ? String(a.recipient_id).slice(0, 8) : "the event's actor"}: "${a.title ?? ctx.event.name}"`,
        details: { title: a.title ?? ctx.event.name, body: a.body ?? "", level: a.level ?? "medium", recipient: a.recipient_id ?? ctx.actor?.id ?? null } };
    }
    if (type === "create_task") {
      return { index, type, outcome: "execute", summary: `Create ${a.priority ?? "medium"} task "${a.title ?? `Follow up: ${ctx.event.name}`}"`,
        details: { title: a.title ?? `Follow up: ${ctx.event.name}`, priority: a.priority ?? "medium", owner: a.owner_id ?? ctx.actor?.id ?? null, entity_type: ctx.event.entity_type ?? null } };
    }
    const name = String(a.name ?? "automation.emitted");
    return { index, type, outcome: "execute", summary: `Publish event "${name}"`, details: { name, metadata: a.metadata ?? {} } };
  });
}

export function simulateRule(rule: SimRule, ctx: SimContext, allRules: SimRule[] = []): SimulationResult {
  const triggerMatched = triggerMatches(rule.trigger_event, ctx.event.name);
  const { results, passed } = evaluateConditions(rule.conditions, ctx);
  const willRun = triggerMatched && passed;
  const actions = willRun ? planActions(rule.actions, ctx) : [];
  const resultingEvents: ResultingEvent[] = [];
  for (const a of actions) {
    if (a.type === "emit_event") resultingEvents.push({ name: String(a.details.name), source: `action #${a.index + 1}` });
    if (a.outcome === "await_approval") resultingEvents.push({ name: `approval.requested (${a.type})`, source: `action #${a.index + 1}` });
    if (a.type === "notify") resultingEvents.push({ name: "notification.created", source: `action #${a.index + 1}` });
    if (a.type === "create_task") resultingEvents.push({ name: "task.created", source: `action #${a.index + 1}` });
  }
  const cascades = resultingEvents
    .filter((e) => !e.name.includes(" ") && !["notification.created", "task.created"].includes(e.name))
    .map((e) => ({
      event: e.name,
      rules: allRules.filter((r) => r.enabled !== false && r.id !== rule.id && triggerMatches(r.trigger_event, e.name)).map((r) => r.name ?? r.id ?? "rule"),
    }));
  return { triggerMatched, conditions: results, conditionsPassed: passed, willRun, actions, resultingEvents, cascades };
}

/** Build the engine's evaluation context from a stored event (mirrors ttos-dispatch). */
export function contextFromEvent(evt: { name: string; module?: string; entity_type?: string | null; entity_id?: string | null; agency_id?: string; actor_id?: string | null; metadata?: Record<string, unknown> }): SimContext {
  return {
    event: { name: evt.name, module: evt.module, entity_type: evt.entity_type ?? null, entity_id: evt.entity_id ?? null },
    payload: { ...(evt.metadata ?? {}), agency_id: evt.agency_id },
    actor: { id: evt.actor_id ?? null },
  };
}

// ---- Conflict primitives (shared with the engine) -------------------------

const OPPOSITES: [string, string][] = [
  ["approve", "reject"], ["approved", "rejected"], ["start", "stop"], ["started", "stopped"],
  ["enable", "disable"], ["enabled", "disabled"], ["open", "close"], ["opened", "closed"],
  ["activate", "deactivate"], ["activated", "deactivated"], ["accept", "decline"], ["accepted", "declined"],
  ["pass", "fail"], ["passed", "failed"], ["hire", "reject"], ["hold", "release"],
];
const SIDE = new Map<string, string>();
OPPOSITES.forEach(([a, b], i) => { SIDE.set(a, `${i}:a`); SIDE.set(b, `${i}:b`); });

/** Identity of an action's effect within one event chain. Same fingerprint = duplicate. */
export function actionFingerprint(action: Record<string, unknown>, ctx: SimContext): string {
  const type = String(action.type ?? "");
  const target = String(action.name ?? action.title ?? action.recipient_id ?? action.owner_id ?? "");
  return [type, target.trim().toLowerCase(), ctx.event.entity_id ?? ""].join("|");
}

/** For emit_event names ending in an opposable verb, returns {key, side}. Same key + different side = contradiction. */
export function actionConflict(action: Record<string, unknown>, ctx: SimContext): { key: string; side: string } | null {
  if (String(action.type) !== "emit_event") return null;
  const parts = String(action.name ?? "").toLowerCase().split(".");
  const verb = parts[parts.length - 1];
  const side = SIDE.get(verb);
  if (!side) return null;
  const pair = side.split(":")[0];
  return { key: `${parts.slice(0, -1).join(".")}.#${pair}|${ctx.event.entity_id ?? ""}`, side };
}

export const MAX_CHAIN_DEPTH = 5;
