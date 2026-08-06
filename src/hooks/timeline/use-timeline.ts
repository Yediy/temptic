// Universal Timeline Workspace hooks (IWOS 5.4B).
// Thin composition layer over the Universal Timeline Engine hooks in
// `use-event-fabric` and the WOIC Cognitive API. No timeline business logic
// is implemented here — this module only shapes engine output for the UI.
import { useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { cognitive } from "@/hooks/woic/use-cognitive";
import { useEventSearch, usePersistedState, type EventFilters } from "@/hooks/activity/use-event-fabric";
import { categoryOf, severityOf, type FabricEvent } from "@/lib/activity/events";
import type { TimelineScope } from "@/lib/timeline/scopes";

export interface TimelineFilters {
  search: string;
  entityType: string;
  entityId: string;
  actorId: string;
  correlationId: string;
  statuses: string[];
  severities: string[];
  from: string;
  to: string;
  tags: string;
  sort: "newest" | "oldest";
  limit: number;
}

export const EMPTY_FILTERS: TimelineFilters = {
  search: "",
  entityType: "",
  entityId: "",
  actorId: "",
  correlationId: "",
  statuses: [],
  severities: [],
  from: "",
  to: "",
  tags: "",
  sort: "newest",
  limit: 500,
};

/** Request a scoped slice of the Universal Timeline Engine. */
export function useTimeline(scope: TimelineScope, filters: TimelineFilters) {
  const engineFilters: EventFilters = useMemo(
    () => ({
      modules: scope.modules.length ? scope.modules : undefined,
      search: filters.search || undefined,
      entityType: filters.entityType || scope.entityType || undefined,
      entityId: filters.entityId || undefined,
      actorId: filters.actorId || undefined,
      correlationId: filters.correlationId || undefined,
      statuses: filters.statuses.length ? filters.statuses : undefined,
      from: filters.from ? new Date(filters.from).toISOString() : undefined,
      to: filters.to ? new Date(filters.to).toISOString() : undefined,
      sort: filters.sort,
      limit: filters.limit,
    }),
    [scope, filters],
  );

  const query = useEventSearch(engineFilters);

  const events = useMemo(() => {
    const rows = query.data ?? [];
    const tag = filters.tags.trim().toLowerCase();
    return rows.filter((e) => {
      if (filters.severities.length && !filters.severities.includes(severityOf(e))) return false;
      if (tag && !JSON.stringify(e.metadata ?? {}).toLowerCase().includes(tag)) return false;
      return true;
    });
  }, [query.data, filters.severities, filters.tags]);

  return { ...query, events };
}

/** Day buckets for grouped rendering. */
export function useTimelineGroups(events: FabricEvent[]) {
  return useMemo(() => {
    const map = new Map<string, FabricEvent[]>();
    for (const e of events) {
      const key = new Date(e.created_at).toISOString().slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return Array.from(map.entries());
  }, [events]);
}

export interface TimelineAnalytics {
  total: number;
  perDay: number;
  byCategory: Array<{ key: string; count: number }>;
  byModule: Array<{ key: string; count: number }>;
  criticalRate: number;
  avgLatencyMs: number;
  unprocessed: number;
  slowest: Array<{ name: string; ms: number }>;
  busiestHour: string;
}

/** Derived operational analytics — computed from engine output only. */
export function useTimelineAnalytics(events: FabricEvent[]): TimelineAnalytics {
  return useMemo(() => {
    const cat = new Map<string, number>();
    const mod = new Map<string, number>();
    const hour = new Map<string, number>();
    const days = new Set<string>();
    let latency = 0;
    let latencyN = 0;
    let critical = 0;
    let unprocessed = 0;
    const slow: Array<{ name: string; ms: number }> = [];

    for (const e of events) {
      cat.set(categoryOf(e), (cat.get(categoryOf(e)) ?? 0) + 1);
      mod.set(e.module, (mod.get(e.module) ?? 0) + 1);
      const d = new Date(e.created_at);
      days.add(d.toISOString().slice(0, 10));
      const h = String(d.getHours()).padStart(2, "0");
      hour.set(h, (hour.get(h) ?? 0) + 1);
      if (severityOf(e) === "critical") critical++;
      if (e.processed_at) {
        const ms = new Date(e.processed_at).getTime() - d.getTime();
        latency += ms;
        latencyN++;
        slow.push({ name: e.name, ms });
      } else {
        unprocessed++;
      }
    }

    const sorted = (m: Map<string, number>) =>
      Array.from(m.entries())
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count);

    return {
      total: events.length,
      perDay: days.size ? Math.round(events.length / days.size) : events.length,
      byCategory: sorted(cat),
      byModule: sorted(mod).slice(0, 10),
      criticalRate: events.length ? Math.round((critical / events.length) * 100) : 0,
      avgLatencyMs: latencyN ? Math.round(latency / latencyN) : 0,
      unprocessed,
      slowest: slow.sort((a, b) => b.ms - a.ms).slice(0, 5),
      busiestHour: sorted(hour)[0]?.key ? `${sorted(hour)[0].key}:00` : "—",
    };
  }, [events]);
}

export type TimelineAiTask =
  | "summarize"
  | "explain"
  | "anomalies"
  | "bottlenecks"
  | "predict"
  | "improvements"
  | "incident_report"
  | "executive_summary"
  | "similar_cases";

const TASK_PROMPT: Record<TimelineAiTask, string> = {
  summarize: "Summarize this timeline of operational events in clear business language.",
  explain: "Explain what happened across this timeline and why, step by step.",
  anomalies: "Detect anomalies and unusual patterns in this timeline. List each with severity.",
  bottlenecks: "Detect process bottlenecks and delays in this timeline. Quantify where possible.",
  predict: "Predict the most likely next events and outcomes based on this timeline.",
  improvements: "Recommend concrete operational improvements based on this timeline.",
  incident_report: "Generate a formal incident report from this timeline.",
  executive_summary: "Generate an executive summary of this timeline for leadership.",
  similar_cases: "Identify similar historical cases and patterns matching this timeline.",
};

/** WOIC-powered timeline intelligence. All reasoning happens in WOIC. */
export function useTimelineAi() {
  const { agencyId } = useAuth();
  return useMutation({
    mutationFn: async (vars: { task: TimelineAiTask; scope: string; events: FabricEvent[] }) => {
      if (!agencyId) throw new Error("No agency context");
      const operation = vars.task === "predict" ? "predict" : vars.task === "improvements" ? "recommend" : "reason";
      const payload = vars.events.slice(0, 120).map((e) => ({
        at: e.created_at,
        module: e.module,
        name: e.name,
        status: e.status,
        entity: e.entity_type,
        entity_id: e.entity_id,
        correlation_id: e.correlation_id,
      }));
      const res = await cognitive<Record<string, unknown>>(agencyId, operation, {
        question: `${TASK_PROMPT[vars.task]}\n\nScope: ${vars.scope}. ${payload.length} events supplied.`,
        subject_entity: "timeline",
        subject_id: vars.scope,
        context: { events: payload },
      });
      const text =
        (res?.answer as string) ??
        (res?.summary as string) ??
        (res?.text as string) ??
        (res?.reasoning as string) ??
        JSON.stringify(res, null, 2);
      return text;
    },
  });
}

export interface SavedTimelineView {
  id: string;
  name: string;
  scope: string;
  filters: TimelineFilters;
  created_at: string;
}

export function useSavedTimelineViews() {
  const [views, setViews] = usePersistedState<SavedTimelineView[]>("timeline.views", []);
  return { views, setViews };
}

export interface TimelineSettings {
  density: "comfortable" | "dense";
  grouping: "day" | "none";
  autoRefresh: boolean;
  defaultLimit: number;
  showAiPanel: boolean;
  showAnalytics: boolean;
}

export const DEFAULT_TIMELINE_SETTINGS: TimelineSettings = {
  density: "comfortable",
  grouping: "day",
  autoRefresh: true,
  defaultLimit: 500,
  showAiPanel: true,
  showAnalytics: true,
};

export function useTimelineSettings() {
  const [settings, setSettings] = usePersistedState<TimelineSettings>("timeline.settings", DEFAULT_TIMELINE_SETTINGS);
  return { settings: { ...DEFAULT_TIMELINE_SETTINGS, ...settings }, setSettings };
}

export function usePinnedEvents() {
  const [pinned, setPinned] = usePersistedState<string[]>("timeline.pinned", []);
  const toggle = (id: string) => setPinned((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  return { pinned, toggle };
}

export function useRecentSearches() {
  const [recent, setRecent] = usePersistedState<string[]>("timeline.searches", []);
  const push = (q: string) => {
    const v = q.trim();
    if (!v) return;
    setRecent((p) => [v, ...p.filter((x) => x !== v)].slice(0, 12));
  };
  return { recent, push, clear: () => setRecent([]) };
}

export function exportTimelineCsv(events: FabricEvent[], filename: string) {
  const header = ["timestamp", "module", "name", "status", "entity_type", "entity_id", "actor_id", "correlation_id"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    header.join(","),
    ...events.map((e) =>
      [e.created_at, e.module, e.name, e.status, e.entity_type, e.entity_id, e.actor_id, e.correlation_id]
        .map(esc)
        .join(","),
    ),
  ].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
