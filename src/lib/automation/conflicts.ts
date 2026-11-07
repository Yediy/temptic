// Static conflict analysis across automation rules. Pure; mirrors the engine's
// runtime protections (correlation ledger + priority ordering + loop guard).
import { actionConflict, actionFingerprint, MAX_CHAIN_DEPTH, type SimContext, type SimRule } from "./simulate";

export type ConflictRule = SimRule & { id: string; name: string; priority?: number | null };
export type ConflictKind = "duplicate" | "contradiction" | "race" | "loop" | "wildcard";
export type ConflictFinding = {
  kind: ConflictKind;
  level: "error" | "warning" | "info";
  rules: string[]; // rule ids
  message: string;
  resolution: string;
};

type Cond = { field?: string; operator?: string; value?: unknown; joiner?: string };

/** True when two triggers can fire on the same event. */
export function triggersOverlap(a: string, b: string) {
  return a === "*" || b === "*" || a === b;
}

/** Conservative: only says "disjoint" when both rules are AND-only and require different eq values on the same field. */
export function conditionsDisjoint(a: unknown, b: unknown): boolean {
  const ca = (Array.isArray(a) ? a : []) as Cond[];
  const cb = (Array.isArray(b) ? b : []) as Cond[];
  if ([...ca, ...cb].some((c) => c.joiner && c.joiner !== "and")) return false;
  for (const x of ca) {
    if (x.operator !== "eq") continue;
    for (const y of cb) {
      if (y.operator === "eq" && y.field === x.field && String(y.value) !== String(x.value)) return true;
    }
  }
  return false;
}

const prio = (r: ConflictRule) => r.priority ?? 100;
const actionsOf = (r: ConflictRule) => (Array.isArray(r.actions) ? (r.actions as Record<string, unknown>[]) : []);

/** Winner = lower priority number; ties are a race (engine order is not guaranteed). */
function winner(a: ConflictRule, b: ConflictRule): ConflictRule | null {
  if (prio(a) === prio(b)) return null;
  return prio(a) < prio(b) ? a : b;
}

export function analyzeConflicts(input: ConflictRule[]): ConflictFinding[] {
  const rules = input.filter((r) => r.enabled !== false);
  const findings: ConflictFinding[] = [];
  const ctxFor = (trigger: string): SimContext => ({ event: { name: trigger, entity_id: "same-entity" }, payload: {} });

  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      const a = rules[i], b = rules[j];
      if (!triggersOverlap(a.trigger_event, b.trigger_event)) continue;
      if (conditionsDisjoint(a.conditions, b.conditions)) continue;
      const ctx = ctxFor(a.trigger_event === "*" ? b.trigger_event : a.trigger_event);
      const w = winner(a, b);
      const ids = [a.id, b.id];

      if ((a.trigger_event === "*") !== (b.trigger_event === "*")) {
        findings.push({ kind: "wildcard", level: "info", rules: ids,
          message: `"${a.trigger_event === "*" ? a.name : b.name}" listens to every event, so it overlaps "${a.trigger_event === "*" ? b.name : a.name}".`,
          resolution: "Narrow the wildcard trigger if the overlap isn't intended." });
      }

      const fa = new Map(actionsOf(a).map((x) => [actionFingerprint(x, ctx), x]));
      const dupes = actionsOf(b).filter((x) => fa.has(actionFingerprint(x, ctx)));
      for (const d of dupes) {
        findings.push({ kind: "duplicate", level: "warning", rules: ids,
          message: `"${a.name}" and "${b.name}" both perform ${d.type} "${String(d.title ?? d.name ?? "")}" on the same event.`,
          resolution: w ? `Engine runs it once — "${w.name}" (priority ${prio(w)}) wins; the other is suppressed.` : "Engine runs it once, but whichever finishes first wins. Give the rules different priorities." });
      }

      const ka = actionsOf(a).map((x) => actionConflict(x, ctx)).filter(Boolean) as { key: string; side: string }[];
      const kb = actionsOf(b).map((x) => actionConflict(x, ctx)).filter(Boolean) as { key: string; side: string }[];
      for (const x of ka) for (const y of kb) {
        if (x.key === y.key && x.side !== y.side) {
          findings.push({ kind: "contradiction", level: "error", rules: ids,
            message: `"${a.name}" and "${b.name}" publish opposite outcomes for the same record.`,
            resolution: w ? `Only "${w.name}" (priority ${prio(w)}) takes effect; the other is blocked. Fix the conditions so both can't match.` : "Only the first to run takes effect — unpredictable. Set different priorities or make the conditions exclusive." });
        }
      }

      if (!w && actionsOf(a).length && actionsOf(b).length && !dupes.length) {
        findings.push({ kind: "race", level: "warning", rules: ids,
          message: `"${a.name}" and "${b.name}" fire on the same event with equal priority (${prio(a)}); their order is not guaranteed.`,
          resolution: "Set different priorities if one should act first." });
      }
    }
  }

  // Loops: follow emit_event edges between rules.
  const emits = (r: ConflictRule) => actionsOf(r).filter((x) => x.type === "emit_event").map((x) => String(x.name ?? "automation.emitted"));
  const next = (r: ConflictRule) => rules.filter((o) => emits(r).some((e) => triggersOverlap(o.trigger_event, e) && o.trigger_event !== "*"));
  const seen = new Set<string>();
  for (const start of rules) {
    const stack: ConflictRule[][] = [[start]];
    while (stack.length) {
      const path = stack.pop()!;
      for (const n of next(path[path.length - 1])) {
        if (n.id === start.id) {
          const key = path.map((p) => p.id).sort().join(",");
          if (!seen.has(key)) {
            seen.add(key);
            findings.push({ kind: "loop", level: "error", rules: path.map((p) => p.id),
              message: `Loop: ${[...path, start].map((p) => `"${p.name}"`).join(" → ")}.`,
              resolution: `Engine stops the chain after ${MAX_CHAIN_DEPTH} hops, but remove the cycle.` });
          }
        } else if (path.length < 6 && !path.some((p) => p.id === n.id)) stack.push([...path, n]);
      }
    }
  }
  const order = { error: 0, warning: 1, info: 2 };
  return findings.sort((x, y) => order[x.level] - order[y.level]);
}
