// Maps Event Fabric rows (ttos_events) into Live Observation rows and builds server-side filters.
import { humanizeName, severityOf, type FabricEvent } from "@/lib/activity/events";

export type Freshness = "CURRENT" | "AGING" | "STALE" | "EXPIRED";
const HOUR = 3_600_000;
/** Age thresholds: <1h current, <24h aging, <7d stale, otherwise expired. */
export const FRESHNESS_WINDOWS: Record<Freshness, [number, number]> = {
  CURRENT: [0, HOUR],
  AGING: [HOUR, 24 * HOUR],
  STALE: [24 * HOUR, 7 * 24 * HOUR],
  EXPIRED: [7 * 24 * HOUR, Number.POSITIVE_INFINITY],
};

export function freshnessOf(createdAt: string, now = Date.now()): Freshness {
  const age = now - new Date(createdAt).getTime();
  for (const [k, [lo, hi]] of Object.entries(FRESHNESS_WINDOWS)) if (age >= lo && age < hi) return k as Freshness;
  return "CURRENT"; // future-dated
}

/** created_at bounds (ISO) for a freshness filter. */
export function freshnessRange(f: Freshness, now = Date.now()): { from?: string; to?: string } {
  const [lo, hi] = FRESHNESS_WINDOWS[f];
  return {
    to: lo > 0 ? new Date(now - lo).toISOString() : undefined,
    from: Number.isFinite(hi) ? new Date(now - hi).toISOString() : undefined,
  };
}

/** PostgREST `or` filter for free-text search; strips characters that would break the filter grammar. */
export function searchFilter(q: string): string | null {
  const clean = q.replace(/[,()*%\\"]/g, " ").trim();
  if (!clean) return null;
  const p = `*${clean}*`;
  return ["name", "module", "entity_type", "status"].map((c) => `${c}.ilike.${p}`).join(",");
}

export function toObservation(e: FabricEvent, now = Date.now()): Record<string, unknown> {
  const rel = Array.isArray(e.related_objects) ? e.related_objects : [];
  return {
    id: e.id,
    occurred_at: e.created_at,
    source: e.module,
    observation_type: e.name,
    primary_entity: e.entity_type ? `${e.entity_type} ${e.entity_id?.slice(0, 8) ?? ""}`.trim() : null,
    related_entities: rel,
    summary: humanizeName(e.name),
    freshness: freshnessOf(e.created_at, now),
    severity: severityOf(e),
    status: e.status,
    correlation_id: e.correlation_id,
    metadata: e.metadata,
  };
}
