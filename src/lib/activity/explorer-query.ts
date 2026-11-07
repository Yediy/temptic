// Event Explorer query model: unlimited combined rules, multi-key sort, grouping, export.
// Rules translate to PostgREST filters so filtering happens in the database.
import type { FabricEvent } from "@/lib/activity/events";

export type FieldKind = "text" | "uuid" | "date" | "json";
export const FIELDS: Record<string, { label: string; kind: FieldKind }> = {
  name: { label: "Event name", kind: "text" },
  module: { label: "Module", kind: "text" },
  status: { label: "Status", kind: "text" },
  entity_type: { label: "Entity type", kind: "text" },
  entity_id: { label: "Entity ID", kind: "uuid" },
  correlation_id: { label: "Correlation ID", kind: "uuid" },
  actor_id: { label: "Actor ID", kind: "uuid" },
  created_at: { label: "Created", kind: "date" },
  processed_at: { label: "Processed", kind: "date" },
  metadata: { label: "Metadata key", kind: "json" },
};

export type Operator =
  | "eq" | "neq" | "contains" | "not_contains" | "starts_with" | "ends_with"
  | "in" | "not_in" | "empty" | "not_empty" | "after" | "before";

export const OPERATOR_LABEL: Record<Operator, string> = {
  eq: "is", neq: "is not", contains: "contains", not_contains: "does not contain",
  starts_with: "starts with", ends_with: "ends with", in: "is any of", not_in: "is none of",
  empty: "is empty", not_empty: "is not empty", after: "after", before: "before",
};

export const OPERATORS_FOR: Record<FieldKind, Operator[]> = {
  text: ["eq", "neq", "contains", "not_contains", "starts_with", "ends_with", "in", "not_in", "empty", "not_empty"],
  uuid: ["eq", "neq", "in", "not_in", "empty", "not_empty"],
  date: ["after", "before", "empty", "not_empty"],
  json: ["eq", "neq", "contains", "not_contains", "empty", "not_empty"],
};

export const NO_VALUE: Operator[] = ["empty", "not_empty"];

export interface Rule {
  id: string;
  field: string;
  /** For metadata rules: the JSON key, e.g. "source" or "nested.key". */
  key?: string;
  op: Operator;
  value: string;
}
export interface RuleGroup { id: string; match: "all" | "any"; rules: Rule[] }
export interface ExplorerQuery {
  match: "all" | "any"; // how groups combine
  groups: RuleGroup[];
}
export interface SortKey { field: string; dir: "asc" | "desc" }
export type GroupBy = "none" | "module" | "status" | "entity_type" | "name" | "day" | "hour" | "correlation_id" | "actor_id";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_KEY = /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$/;

/** A rule is usable when its field/op are valid and it has the value its operator needs. */
export function isComplete(r: Rule): boolean {
  const f = FIELDS[r.field];
  if (!f || !OPERATORS_FOR[f.kind].includes(r.op)) return false;
  if (f.kind === "json" && !(r.key && SAFE_KEY.test(r.key))) return false;
  if (NO_VALUE.includes(r.op)) return true;
  const v = r.value.trim();
  if (!v) return false;
  if (f.kind === "uuid") return splitList(r).every((x) => UUID_RE.test(x));
  if (f.kind === "date") return !Number.isNaN(new Date(v).getTime());
  return true;
}

function splitList(r: Rule): string[] {
  return r.op === "in" || r.op === "not_in"
    ? r.value.split(",").map((s) => s.trim()).filter(Boolean)
    : [r.value.trim()];
}

/** Quotes a value for PostgREST filter strings (handles commas, parentheses, quotes). */
export function pgQuote(v: string): string {
  return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
const likeEscape = (v: string) => v.replace(/[%_*\\]/g, (c) => `\\${c}`);

function column(r: Rule): string {
  if (FIELDS[r.field].kind !== "json") return r.field;
  const parts = r.key!.split(".");
  const last = parts.pop()!;
  return parts.length ? `metadata->${parts.join("->")}->>${last}` : `metadata->>${last}`;
}

/** Converts one rule into a PostgREST condition, e.g. `name.ilike."*payroll*"`. */
export function ruleToFilter(r: Rule): string | null {
  if (!isComplete(r)) return null;
  const col = column(r);
  const v = r.value.trim();
  switch (r.op) {
    case "eq": return `${col}.eq.${pgQuote(v)}`;
    case "neq": return `${col}.neq.${pgQuote(v)}`;
    case "contains": return `${col}.ilike.${pgQuote(`*${likeEscape(v)}*`)}`;
    case "not_contains": return `${col}.not.ilike.${pgQuote(`*${likeEscape(v)}*`)}`;
    case "starts_with": return `${col}.ilike.${pgQuote(`${likeEscape(v)}*`)}`;
    case "ends_with": return `${col}.ilike.${pgQuote(`*${likeEscape(v)}`)}`;
    case "in": return `${col}.in.(${splitList(r).map(pgQuote).join(",")})`;
    case "not_in": return `${col}.not.in.(${splitList(r).map(pgQuote).join(",")})`;
    case "empty": return `${col}.is.null`;
    case "not_empty": return `${col}.not.is.null`;
    case "after": return `${col}.gte.${pgQuote(new Date(v).toISOString())}`;
    case "before": return `${col}.lte.${pgQuote(new Date(v).toISOString())}`;
  }
}

/**
 * Builds a single PostgREST logic expression for the whole query, usable with `.or()`.
 * Returns null when there are no complete rules (no filtering).
 */
export function queryToLogic(q: ExplorerQuery): string | null {
  const groups = q.groups
    .map((g) => {
      const parts = g.rules.map(ruleToFilter).filter((x): x is string => !!x);
      if (!parts.length) return null;
      return parts.length === 1 ? parts[0] : `${g.match === "all" ? "and" : "or"}(${parts.join(",")})`;
    })
    .filter((x): x is string => !!x);
  if (!groups.length) return null;
  // Wrapped so callers can always pass the result to `.or()`.
  return q.match === "all" ? `and(${groups.join(",")})` : groups.join(",");
}

export function countActiveRules(q: ExplorerQuery): number {
  return q.groups.reduce((n, g) => n + g.rules.filter(isComplete).length, 0);
}

// ---------- Sorting / grouping (client side over the fetched page) ----------

const sortValue = (e: FabricEvent, field: string): string => String((e as unknown as Record<string, unknown>)[field] ?? "");

export function sortEvents(events: FabricEvent[], keys: SortKey[]): FabricEvent[] {
  if (!keys.length) return events;
  return [...events].sort((a, b) => {
    for (const k of keys) {
      const av = sortValue(a, k.field), bv = sortValue(b, k.field);
      if (av === bv) continue;
      // Empty values always sort last.
      if (!av) return 1;
      if (!bv) return -1;
      const c = av.localeCompare(bv);
      return k.dir === "asc" ? c : -c;
    }
    return 0;
  });
}

export function groupKey(e: FabricEvent, by: GroupBy): string {
  switch (by) {
    case "none": return "All results";
    case "day": return e.created_at.slice(0, 10);
    case "hour": return `${e.created_at.slice(0, 13).replace("T", " ")}:00`;
    default: return sortValue(e, by) || "(none)";
  }
}

export function groupEvents(events: FabricEvent[], by: GroupBy): Array<{ key: string; items: FabricEvent[] }> {
  const map = new Map<string, FabricEvent[]>();
  for (const e of events) {
    const k = groupKey(e, by);
    const list = map.get(k);
    if (list) list.push(e); else map.set(k, [e]);
  }
  return Array.from(map, ([key, items]) => ({ key, items }));
}

// ---------- Export ----------

export const EXPORT_COLUMNS = [
  "created_at", "name", "module", "status", "entity_type", "entity_id",
  "correlation_id", "actor_id", "processed_at", "metadata",
] as const;

export function toCsv(events: FabricEvent[]): string {
  const cell = (v: unknown) => {
    const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    // Guard against spreadsheet formula injection.
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const rows = events.map((e) => EXPORT_COLUMNS.map((c) => cell((e as unknown as Record<string, unknown>)[c])).join(","));
  return [EXPORT_COLUMNS.join(","), ...rows].join("\n");
}

export const newId = () => Math.random().toString(36).slice(2, 10);
export const emptyQuery = (): ExplorerQuery => ({ match: "all", groups: [{ id: newId(), match: "all", rules: [] }] });
