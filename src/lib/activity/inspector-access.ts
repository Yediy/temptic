import type { FabricEvent } from "@/lib/activity/events";

export type InspectorSection = "payload" | "metadata" | "affected" | "woic" | "graph";

/** Which roles may see each Event Inspector section (display layer; RLS stays the data boundary). */
export const INSPECTOR_SECTION_ROLES: Record<InspectorSection, string[]> = {
  payload: ["super_admin", "agency_admin", "dispatcher"],
  metadata: ["super_admin", "agency_admin", "dispatcher", "payroll"],
  affected: ["super_admin", "agency_admin", "dispatcher", "payroll", "viewer"],
  woic: ["super_admin", "agency_admin", "dispatcher"],
  graph: ["super_admin", "agency_admin", "dispatcher", "payroll", "viewer"],
};

export function canSee(roles: readonly string[], section: InspectorSection): boolean {
  return roles.some((r) => INSPECTOR_SECTION_ROLES[section].includes(r));
}

const SENSITIVE = /(email|phone|ssn|dob|birth|address|password|token|secret|rate|salary|pay_rate|bank)/i;
const INTERNAL_META = new Set(["woic", "interpretation", "attempts", "retry_count", "replay_of", "error", "last_error"]);

/** Masks sensitive keys unless the viewer is an agency/super admin. */
export function redact(value: unknown, roles: readonly string[]): unknown {
  if (roles.includes("super_admin") || roles.includes("agency_admin")) return value;
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      return Object.fromEntries(
        Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, SENSITIVE.test(k) ? "••• restricted" : walk(x)]),
      );
    }
    return v;
  };
  return walk(value);
}

/** Splits event.metadata into business payload vs processing metadata. */
export function splitMetadata(meta: Record<string, unknown> | null | undefined) {
  const payload: Record<string, unknown> = {};
  const processing: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta ?? {})) (INTERNAL_META.has(k) ? processing : payload)[k] = v;
  return { payload, processing };
}

export interface GraphNode { id: string; label: string; kind: "event" | "related" | "object" | "subscriber"; ref?: FabricEvent }
export interface GraphEdge { from: string; to: string; label: string }

/** Builds the relationship graph centred on one event. */
export function buildEventGraph(
  evt: FabricEvent,
  related: FabricEvent[],
  subscribers: { id: string; handler_key: string }[],
  includeObjects: boolean,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [{ id: evt.id, label: evt.name, kind: "event", ref: evt }];
  const edges: GraphEdge[] = [];
  for (const r of related.slice(0, 8)) {
    nodes.push({ id: r.id, label: r.name, kind: "related", ref: r });
    edges.push({ from: evt.id, to: r.id, label: evt.correlation_id ? "correlated" : "same entity" });
  }
  if (includeObjects) {
    const objs: { type: string; id: string }[] = [];
    if (evt.entity_type && evt.entity_id) objs.push({ type: evt.entity_type, id: evt.entity_id });
    const ro = Array.isArray(evt.related_objects) ? (evt.related_objects as Record<string, unknown>[]) : [];
    for (const o of ro) {
      const id = String(o?.id ?? o?.entity_id ?? "");
      if (id) objs.push({ type: String(o?.type ?? o?.entity_type ?? "object"), id });
    }
    const seen = new Set<string>();
    for (const o of objs.slice(0, 8)) {
      const nid = `obj:${o.type}:${o.id}`;
      if (seen.has(nid)) continue;
      seen.add(nid);
      nodes.push({ id: nid, label: `${o.type} ${o.id.slice(0, 8)}`, kind: "object" });
      edges.push({ from: evt.id, to: nid, label: "affects" });
    }
  }
  for (const s of subscribers.slice(0, 6)) {
    nodes.push({ id: `sub:${s.id}`, label: s.handler_key, kind: "subscriber" });
    edges.push({ from: evt.id, to: `sub:${s.id}`, label: "handled by" });
  }
  return { nodes, edges };
}
