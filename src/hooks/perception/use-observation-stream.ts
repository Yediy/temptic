// Live Observations over the real Event Fabric stream (ttos_events): realtime + pause buffer,
// server-side search/freshness filters, and per-user pins stored in perception_observation_pins.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { FabricEvent } from "@/lib/activity/events";
import { flush, receive, type LiveBuffer } from "@/lib/activity/live-buffer";
import { freshnessRange, searchFilter, type Freshness } from "@/lib/perception/observation-stream";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;
const COLS = "id,agency_id,module,name,actor_id,entity_type,entity_id,status,metadata,related_objects,correlation_id,processed_at,created_at";

export function useObservationStream(opts: { search: string; freshness: Freshness | ""; source: string; limit?: number }) {
  const { agencyId } = useAuth();
  const limit = opts.limit ?? 200;
  const [buf, setBuf] = useState<LiveBuffer>({ events: [], pending: [] });
  const [paused, setPausedState] = useState(false);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const filtersActive = !!(opts.search.trim() || opts.freshness || opts.source);

  const fetchRows = useCallback(async (): Promise<FabricEvent[]> => {
    let q = sb.from("ttos_events").select(COLS).eq("agency_id", agencyId);
    const s = searchFilter(opts.search);
    if (s) q = q.or(s);
    if (opts.source) q = q.eq("module", opts.source);
    if (opts.freshness) {
      const r = freshnessRange(opts.freshness);
      if (r.from) q = q.gte("created_at", r.from);
      if (r.to) q = q.lt("created_at", r.to);
    }
    const { data, error: err } = await q.order("created_at", { ascending: false }).limit(limit);
    if (err) throw new Error(err.message);
    return (data ?? []) as FabricEvent[];
  }, [agencyId, opts.search, opts.freshness, opts.source, limit]);

  const refresh = useCallback(async () => {
    if (!agencyId) return;
    try {
      const rows = await fetchRows();
      setError(null);
      setBuf((b) => (pausedRef.current ? receive(b, rows, true, limit) : { events: rows, pending: [] }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load observations");
    } finally {
      setLoading(false);
    }
  }, [agencyId, fetchRows, limit]);

  // Reload whenever filters change (debounced for typing).
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => void refresh(), 250);
    return () => clearTimeout(t);
  }, [refresh]);

  useEffect(() => {
    if (!agencyId) return;
    const channel = supabase
      .channel(`observations-${agencyId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ttos_events", filter: `agency_id=eq.${agencyId}` },
        () => {
          // Filters are evaluated server-side, so new rows trigger a filtered re-read; unfiltered we append directly.
          if (filtersActive) void refresh();
        })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ttos_events", filter: `agency_id=eq.${agencyId}` },
        (p) => { if (!filtersActive) setBuf((b) => receive(b, [p.new as FabricEvent], pausedRef.current, limit)); })
      .subscribe((st) => setConnected(st === "SUBSCRIBED"));
    const poll = setInterval(() => { if (!pausedRef.current) void refresh(); }, 30_000);
    return () => { supabase.removeChannel(channel); clearInterval(poll); };
  }, [agencyId, filtersActive, refresh, limit]);

  const setPaused = useCallback((p: boolean) => {
    setPausedState(p);
    if (!p) setBuf((b) => flush(b, limit));
  }, [limit]);

  return { events: buf.events, pending: buf.pending.length, paused, setPaused, connected, loading, error, refresh };
}

/** Distinct sources (modules) for the filter dropdown. */
export function useObservationSources() {
  const { agencyId } = useAuth();
  return useQuery({
    queryKey: ["observations", "sources", agencyId],
    enabled: !!agencyId,
    queryFn: async (): Promise<string[]> => {
      const { data } = await sb.from("ttos_events").select("module").eq("agency_id", agencyId)
        .order("created_at", { ascending: false }).limit(1000);
      return Array.from(new Set(((data ?? []) as { module: string }[]).map((r) => r.module))).sort();
    },
  });
}

/** Per-user pins persisted server-side; pinned rows are fetched by id so they survive stream churn. */
export function useObservationPins() {
  const { agencyId } = useAuth();
  const qc = useQueryClient();
  const key = ["observations", "pins", agencyId];
  const pinsQ = useQuery({
    queryKey: key,
    enabled: !!agencyId,
    queryFn: async (): Promise<{ ids: string[]; events: FabricEvent[] }> => {
      const { data } = await sb.from("perception_observation_pins").select("observation_id")
        .eq("agency_id", agencyId).order("created_at", { ascending: false });
      const ids = ((data ?? []) as { observation_id: string }[]).map((r) => r.observation_id);
      if (!ids.length) return { ids, events: [] };
      const { data: ev } = await sb.from("ttos_events").select(COLS).in("id", ids);
      return { ids, events: (ev ?? []) as FabricEvent[] };
    },
  });
  const ids = useMemo(() => pinsQ.data?.ids ?? [], [pinsQ.data]);
  const toggle = useCallback(async (id: string) => {
    const { data: auth } = await supabase.auth.getUser();
    if (ids.includes(id)) {
      await sb.from("perception_observation_pins").delete().eq("observation_id", id).eq("user_id", auth.user?.id);
    } else {
      await sb.from("perception_observation_pins").insert({ agency_id: agencyId, observation_id: id });
    }
    await qc.invalidateQueries({ queryKey: key });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, agencyId, qc]);
  return { ids, events: pinsQ.data?.events ?? [], toggle };
}
