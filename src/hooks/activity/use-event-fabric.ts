// Universal Event Fabric hooks (IWOS 5.1B). Read-only aggregation over TTOS + WOIC storage.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { FabricEvent } from "@/lib/activity/events";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

const EVENT_COLS =
  "id,agency_id,module,name,actor_id,entity_type,entity_id,status,metadata,related_objects,correlation_id,processed_at,created_at";

export interface EventFilters {
  search?: string;
  modules?: string[];
  statuses?: string[];
  entityType?: string;
  entityId?: string;
  correlationId?: string;
  actorId?: string;
  from?: string;
  to?: string;
  limit?: number;
  sort?: "newest" | "oldest";
}

/** Live stream with realtime insert subscription + polling fallback. */
export function useLiveEvents(limit = 150) {
  const { agencyId } = useAuth();
  const [events, setEvents] = useState<FabricEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const refresh = useCallback(async () => {
    if (!agencyId) return;
    const { data } = await sb
      .from("ttos_events")
      .select(EVENT_COLS)
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false })
      .limit(limit);
    setEvents((data ?? []) as FabricEvent[]);
  }, [agencyId, limit]);

  useEffect(() => {
    void refresh();
    if (!agencyId) return;
    const channel = supabase
      .channel(`fabric-events-${agencyId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ttos_events", filter: `agency_id=eq.${agencyId}` },
        (payload) => {
          if (pausedRef.current) return;
          setEvents((prev) => [payload.new as FabricEvent, ...prev].slice(0, limit));
        },
      )
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    const poll = setInterval(() => {
      if (!pausedRef.current) void refresh();
    }, 20_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [agencyId, limit, refresh]);

  return { events, connected, paused, setPaused, refresh };
}

/** Advanced query for the Event Explorer. */
export function useEventSearch(filters: EventFilters) {
  const { agencyId } = useAuth();
  return useQuery({
    queryKey: ["fabric", "search", agencyId, filters],
    enabled: !!agencyId,
    queryFn: async (): Promise<FabricEvent[]> => {
      let q = sb.from("ttos_events").select(EVENT_COLS).eq("agency_id", agencyId);
      if (filters.modules?.length) q = q.in("module", filters.modules);
      if (filters.statuses?.length) q = q.in("status", filters.statuses);
      if (filters.entityType) q = q.eq("entity_type", filters.entityType);
      if (filters.entityId) q = q.eq("entity_id", filters.entityId);
      if (filters.correlationId) q = q.eq("correlation_id", filters.correlationId);
      if (filters.actorId) q = q.eq("actor_id", filters.actorId);
      if (filters.from) q = q.gte("created_at", filters.from);
      if (filters.to) q = q.lte("created_at", filters.to);
      if (filters.search) q = q.ilike("name", `%${filters.search}%`);
      q = q.order("created_at", { ascending: filters.sort === "oldest" }).limit(filters.limit ?? 300);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as FabricEvent[];
    },
  });
}

/** Distinct modules present in the fabric — used for filter chips. */
export function useEventModules() {
  const { agencyId } = useAuth();
  return useQuery({
    queryKey: ["fabric", "modules", agencyId],
    enabled: !!agencyId,
    staleTime: 300_000,
    queryFn: async (): Promise<string[]> => {
      const { data } = await sb
        .from("ttos_events")
        .select("module")
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false })
        .limit(1000);
      return Array.from(new Set(((data ?? []) as Array<{ module: string }>).map((r) => r.module))).sort();
    },
  });
}

/** Related events by correlation id / entity for the inspector. */
export function useRelatedEvents(evt: FabricEvent | null) {
  const { agencyId } = useAuth();
  return useQuery({
    queryKey: ["fabric", "related", evt?.id],
    enabled: !!agencyId && !!evt,
    queryFn: async (): Promise<FabricEvent[]> => {
      if (!evt) return [];
      let q = sb.from("ttos_events").select(EVENT_COLS).eq("agency_id", agencyId).neq("id", evt.id);
      if (evt.correlation_id) q = q.eq("correlation_id", evt.correlation_id);
      else if (evt.entity_id) q = q.eq("entity_id", evt.entity_id);
      else q = q.eq("name", evt.name);
      const { data } = await q.order("created_at", { ascending: false }).limit(25);
      return (data ?? []) as FabricEvent[];
    },
  });
}

/** Registered subscribers for an event name pattern. */
export function useSubscribers() {
  return useQuery({
    queryKey: ["fabric", "subscribers"],
    staleTime: 300_000,
    queryFn: async () => {
      const { data } = await sb.from("ttos_event_subscribers").select("id,module,event_pattern,handler_key,enabled");
      return (data ?? []) as Array<{
        id: string;
        module: string;
        event_pattern: string;
        handler_key: string;
        enabled: boolean;
      }>;
    },
  });
}

export interface FabricHealth {
  throughput: Array<{ bucket: string; count: number }>;
  total24h: number;
  processed24h: number;
  failed24h: number;
  avgLatencyMs: number;
  queueDepth: number;
  retryQueue: number;
  deadLetter: number;
  aiRuns: number;
  aiFailures: number;
  moduleHealth: Array<{ module: string; total: number; failed: number }>;
  automationRuns: number;
  automationFailures: number;
}

export function useFabricHealth() {
  const { agencyId } = useAuth();
  return useQuery({
    queryKey: ["fabric", "health", agencyId],
    enabled: !!agencyId,
    refetchInterval: 30_000,
    queryFn: async (): Promise<FabricHealth> => {
      const since = new Date(Date.now() - 24 * 3600_000).toISOString();
      const [evts, jobs, dlq, ai, autos] = await Promise.all([
        sb
          .from("ttos_events")
          .select("module,status,created_at,processed_at")
          .eq("agency_id", agencyId)
          .gte("created_at", since)
          .limit(5000),
        sb.from("ttos_jobs").select("status,attempts").eq("agency_id", agencyId).limit(2000),
        sb.from("automation_dead_letter").select("id,resolved_at").eq("agency_id", agencyId).limit(1000),
        sb.from("ai_runs").select("status,created_at").eq("agency_id", agencyId).gte("created_at", since).limit(2000),
        sb
          .from("ttos_automation_runs")
          .select("status,duration_ms,ran_at")
          .eq("agency_id", agencyId)
          .gte("ran_at", since)
          .limit(2000),
      ]);

      type E = { module: string; status: string; created_at: string; processed_at: string | null };
      const rows = (evts.data ?? []) as E[];
      const buckets = new Map<string, number>();
      for (let i = 23; i >= 0; i--) {
        const d = new Date(Date.now() - i * 3600_000);
        d.setMinutes(0, 0, 0);
        buckets.set(d.toISOString(), 0);
      }
      let latencySum = 0;
      let latencyCount = 0;
      const modules = new Map<string, { total: number; failed: number }>();
      for (const r of rows) {
        const d = new Date(r.created_at);
        d.setMinutes(0, 0, 0);
        const k = d.toISOString();
        if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1);
        if (r.processed_at) {
          latencySum += new Date(r.processed_at).getTime() - new Date(r.created_at).getTime();
          latencyCount++;
        }
        const m = modules.get(r.module) ?? { total: 0, failed: 0 };
        m.total++;
        if (r.status === "failed" || r.status === "error") m.failed++;
        modules.set(r.module, m);
      }

      const jobRows = (jobs.data ?? []) as Array<{ status: string; attempts: number }>;
      const aiRows = (ai.data ?? []) as Array<{ status: string }>;
      const autoRows = (autos.data ?? []) as Array<{ status: string }>;

      return {
        throughput: Array.from(buckets.entries()).map(([bucket, count]) => ({ bucket, count })),
        total24h: rows.length,
        processed24h: rows.filter((r) => !!r.processed_at).length,
        failed24h: rows.filter((r) => r.status === "failed" || r.status === "error").length,
        avgLatencyMs: latencyCount ? Math.round(latencySum / latencyCount) : 0,
        queueDepth: jobRows.filter((j) => j.status === "pending" || j.status === "queued").length,
        retryQueue: jobRows.filter((j) => (j.attempts ?? 0) > 0 && j.status !== "done").length,
        deadLetter: ((dlq.data ?? []) as Array<{ resolved_at: string | null }>).filter((d) => !d.resolved_at).length,
        aiRuns: aiRows.length,
        aiFailures: aiRows.filter((r) => r.status === "error" || r.status === "failed").length,
        moduleHealth: Array.from(modules.entries())
          .map(([module, v]) => ({ module, ...v }))
          .sort((a, b) => b.total - a.total),
        automationRuns: autoRows.length,
        automationFailures: autoRows.filter((r) => r.status === "failed" || r.status === "error").length,
      };
    },
  });
}

export interface AiActivityItem {
  id: string;
  kind: string;
  title: string;
  detail: string | null;
  confidence: number | null;
  status: string | null;
  source: "recommendation" | "decision" | "prediction" | "reasoning" | "run";
  created_at: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any;
}

export function useAiActivity() {
  const { agencyId } = useAuth();
  return useQuery({
    queryKey: ["fabric", "ai", agencyId],
    enabled: !!agencyId,
    refetchInterval: 60_000,
    queryFn: async (): Promise<AiActivityItem[]> => {
      const [recs, decs, preds, traces, runs] = await Promise.all([
        sb.from("woic_recommendations").select("*").eq("agency_id", agencyId).order("created_at", { ascending: false }).limit(50),
        sb.from("woic_decisions").select("*").eq("agency_id", agencyId).order("created_at", { ascending: false }).limit(50),
        sb.from("woic_prediction_results").select("*").eq("agency_id", agencyId).order("produced_at", { ascending: false }).limit(50),
        sb.from("woic_reasoning_traces").select("*").eq("agency_id", agencyId).order("created_at", { ascending: false }).limit(50),
        sb.from("ai_runs").select("*").eq("agency_id", agencyId).order("created_at", { ascending: false }).limit(50),
      ]);
      const out: AiActivityItem[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const r of (recs.data ?? []) as any[])
        out.push({ id: r.id, kind: r.kind, title: `Recommendation · ${r.kind}`, detail: r.reasoning, confidence: r.score, status: r.status, source: "recommendation", created_at: r.created_at, raw: r });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const d of (decs.data ?? []) as any[])
        out.push({ id: d.id, kind: d.kind, title: `Decision · ${d.kind}`, detail: d.reasoning, confidence: d.confidence, status: d.outcome, source: "decision", created_at: d.created_at, raw: d });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const p of (preds.data ?? []) as any[])
        out.push({ id: p.id, kind: p.subject_entity ?? "prediction", title: `Prediction · ${p.subject_entity ?? "entity"}`, detail: JSON.stringify(p.prediction ?? {}).slice(0, 240), confidence: p.confidence, status: null, source: "prediction", created_at: p.produced_at, raw: p });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const t of (traces.data ?? []) as any[])
        out.push({ id: t.id, kind: t.domain, title: `Reasoning · ${t.domain}`, detail: t.conclusion ?? t.question, confidence: t.confidence, status: t.status, source: "reasoning", created_at: t.created_at, raw: t });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const r of (runs.data ?? []) as any[])
        out.push({ id: r.id, kind: r.kind, title: `AI run · ${r.kind}`, detail: r.output_summary ?? r.input_summary, confidence: null, status: r.status, source: "run", created_at: r.created_at, raw: r });
      return out.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    },
  });
}

export function useAuditHistory(search: string) {
  const { agencyId } = useAuth();
  return useQuery({
    queryKey: ["fabric", "audit", agencyId, search],
    enabled: !!agencyId,
    queryFn: async () => {
      let q = sb
        .from("audit_logs")
        .select("id,ticket_id,actor_type,actor_id,action,old_values,new_values,created_at")
        .order("created_at", { ascending: false })
        .limit(300);
      if (search) q = q.ilike("action", `%${search}%`);
      const { data } = await q;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []) as any[];
    },
  });
}

export function useFabricNotifications() {
  const { agencyId } = useAuth();
  return useQuery({
    queryKey: ["fabric", "notifications", agencyId],
    enabled: !!agencyId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await sb
        .from("ttos_notifications")
        .select("id,title,body,level,entity_type,entity_id,read_at,created_at")
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false })
        .limit(200);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []) as any[];
    },
  });
}

/** Entity directory for organization / worker activity pickers. */
export function useActivitySubjects() {
  const { agencyId } = useAuth();
  return useQuery({
    queryKey: ["fabric", "subjects", agencyId],
    enabled: !!agencyId,
    staleTime: 300_000,
    queryFn: async () => {
      const [clients, workers] = await Promise.all([
        sb.from("clients").select("id,name").eq("agency_id", agencyId).order("name").limit(500),
        sb.from("workers").select("id,first_name,last_name").eq("agency_id", agencyId).order("last_name").limit(1000),
      ]);
      return {
        clients: ((clients.data ?? []) as Array<{ id: string; name: string }>).map((c) => ({ id: c.id, label: c.name })),
        workers: ((workers.data ?? []) as Array<{ id: string; first_name: string; last_name: string }>).map((w) => ({
          id: w.id,
          label: `${w.first_name ?? ""} ${w.last_name ?? ""}`.trim() || w.id.slice(0, 8),
        })),
      };
    },
  });
}

/** Events touching a specific entity (worker / client / project). */
export function useEntityActivity(entityType: string | null, entityId: string | null) {
  const { agencyId } = useAuth();
  return useQuery({
    queryKey: ["fabric", "entity", agencyId, entityType, entityId],
    enabled: !!agencyId && !!entityId,
    queryFn: async (): Promise<FabricEvent[]> => {
      let q = sb.from("ttos_events").select(EVENT_COLS).eq("agency_id", agencyId).eq("entity_id", entityId);
      if (entityType) q = q.eq("entity_type", entityType);
      const { data } = await q.order("created_at", { ascending: false }).limit(300);
      return (data ?? []) as FabricEvent[];
    },
  });
}

/** Replay: re-dispatch existing events through the TTOS dispatcher. Dry-run is client-side only. */
export function useEventReplay() {
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<Array<{ id: string; ok: boolean; message: string; at: string }>>([]);

  const replay = useCallback(async (ids: string[], opts: { dryRun: boolean }) => {
    setRunning(true);
    const results: Array<{ id: string; ok: boolean; message: string; at: string }> = [];
    for (const id of ids) {
      if (opts.dryRun) {
        results.push({ id, ok: true, message: "Dry run — dispatcher not invoked", at: new Date().toISOString() });
        continue;
      }
      const { error } = await supabase.functions.invoke("ttos-dispatch", { body: { event_id: id, replay: true } });
      results.push({
        id,
        ok: !error,
        message: error ? error.message : "Re-dispatched to subscribers",
        at: new Date().toISOString(),
      });
    }
    setLog((prev) => [...results, ...prev].slice(0, 200));
    setRunning(false);
    return results;
  }, []);

  return { replay, running, log };
}

/** Local persisted preferences (saved views, pinned events, layout). */
export function usePersistedState<T>(key: string, initial: T) {
  const storageKey = `iwos.activity.${key}`;
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      /* ignore quota */
    }
  }, [storageKey, value]);
  return [value, setValue] as const;
}

export function useEventCounts(events: FabricEvent[]) {
  return useMemo(() => {
    const byModule = new Map<string, number>();
    for (const e of events) byModule.set(e.module, (byModule.get(e.module) ?? 0) + 1);
    return Array.from(byModule.entries()).sort((a, b) => b[1] - a[1]);
  }, [events]);
}
