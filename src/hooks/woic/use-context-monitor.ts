// Live Context Monitor — polls the WOIC context endpoint (and optionally the
// woic-conversation-summarize endpoint) on an interval, keeps a rolling
// snapshot history, and computes field-level diffs between snapshots.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const CONTEXT_POLL_INTERVALS = [
  { label: "Paused", value: 0 },
  { label: "Every 5s", value: 5_000 },
  { label: "Every 10s", value: 10_000 },
  { label: "Every 30s", value: 30_000 },
  { label: "Every 60s", value: 60_000 },
] as const;

export const SUMMARY_POLL_INTERVALS = [
  { label: "Paused", value: 0 },
  { label: "Every 30s", value: 30_000 },
  { label: "Every 60s", value: 60_000 },
  { label: "Every 5m", value: 300_000 },
] as const;

export type ChangeKind = "added" | "removed" | "changed";

export interface FieldChange {
  field: string;
  kind: ChangeKind;
  before: unknown;
  after: unknown;
}

export interface ContextSnapshot {
  id: string;
  at: string;
  value: Record<string, unknown> | null;
  changes: FieldChange[];
}

const MAX_SNAPSHOTS = 50;

function normalize(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function diffObjects(
  before: unknown,
  after: unknown,
): FieldChange[] {
  const a = normalize(before);
  const b = normalize(after);
  const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).sort();
  const out: FieldChange[] = [];
  for (const field of keys) {
    const prev = a[field];
    const next = b[field];
    if (JSON.stringify(prev) === JSON.stringify(next)) continue;
    const kind: ChangeKind =
      prev === undefined ? "added" : next === undefined ? "removed" : "changed";
    out.push({ field, kind, before: prev, after: next });
  }
  return out;
}

async function fetchContext(agencyId: string) {
  const { data, error } = await supabase.functions.invoke("woic-api", {
    body: { service: "context", action: "get", agency_id: agencyId, params: {} },
  });
  if (error) throw error;
  if (data && typeof data === "object" && "error" in data && (data as any).error) {
    throw new Error(String((data as any).error));
  }
  return ((data as any)?.data ?? data ?? null) as Record<string, unknown> | null;
}

async function fetchSummary(agencyId: string, conversationId: string) {
  const { data, error } = await supabase.functions.invoke("woic-conversation-summarize", {
    body: { agency_id: agencyId, conversation_id: conversationId },
  });
  if (error) throw error;
  if (data && typeof data === "object" && "error" in data && (data as any).error) {
    throw new Error(String((data as any).error));
  }
  return data as { summary: string | null; count?: number };
}

interface MonitorOptions {
  agencyId: string | undefined;
  intervalMs: number;
  conversationId?: string;
  summaryIntervalMs?: number;
}

export function useContextMonitor({
  agencyId,
  intervalMs,
  conversationId,
  summaryIntervalMs = 0,
}: MonitorOptions) {
  const [snapshots, setSnapshots] = useState<ContextSnapshot[]>([]);
  const lastRef = useRef<Record<string, unknown> | null>(null);
  const lastSummaryRef = useRef<string | null>(null);
  const [summaryHistory, setSummaryHistory] = useState<
    { id: string; at: string; summary: string | null; changed: boolean }[]
  >([]);

  const context = useQuery({
    queryKey: ["woic", "context-monitor", agencyId],
    enabled: !!agencyId,
    queryFn: () => fetchContext(agencyId!),
    refetchInterval: intervalMs > 0 ? intervalMs : false,
    refetchIntervalInBackground: false,
  });

  const summary = useQuery({
    queryKey: ["woic", "context-monitor-summary", agencyId, conversationId],
    enabled: !!agencyId && !!conversationId,
    queryFn: () => fetchSummary(agencyId!, conversationId!),
    refetchInterval: summaryIntervalMs > 0 ? summaryIntervalMs : false,
    refetchIntervalInBackground: false,
  });

  // Record a snapshot whenever fresh context data arrives.
  const contextData = context.data;
  const contextUpdatedAt = context.dataUpdatedAt;
  useEffect(() => {
    if (!contextUpdatedAt) return;
    const changes = diffObjects(lastRef.current, contextData ?? null);
    const isFirst = snapshots.length === 0;
    if (!isFirst && changes.length === 0) return;
    lastRef.current = (contextData ?? null) as Record<string, unknown> | null;
    setSnapshots((prev) =>
      [
        {
          id: `${contextUpdatedAt}-${prev.length}`,
          at: new Date(contextUpdatedAt).toISOString(),
          value: (contextData ?? null) as Record<string, unknown> | null,
          changes: isFirst ? [] : changes,
        },
        ...prev,
      ].slice(0, MAX_SNAPSHOTS),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextUpdatedAt]);

  const summaryData = summary.data;
  const summaryUpdatedAt = summary.dataUpdatedAt;
  useEffect(() => {
    if (!summaryUpdatedAt || !summaryData) return;
    const text = summaryData.summary ?? null;
    const changed = lastSummaryRef.current !== null && lastSummaryRef.current !== text;
    if (lastSummaryRef.current === text && summaryHistory.length > 0) return;
    lastSummaryRef.current = text;
    setSummaryHistory((prev) =>
      [
        { id: `${summaryUpdatedAt}-${prev.length}`, at: new Date(summaryUpdatedAt).toISOString(), summary: text, changed },
        ...prev,
      ].slice(0, MAX_SNAPSHOTS),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryUpdatedAt]);

  const latest = snapshots[0] ?? null;
  const changedFields = useMemo(
    () => new Set((latest?.changes ?? []).map((c) => c.field)),
    [latest],
  );

  const clear = useCallback(() => {
    setSnapshots([]);
    setSummaryHistory([]);
    lastRef.current = null;
    lastSummaryRef.current = null;
  }, []);

  return {
    context,
    summary,
    snapshots,
    summaryHistory,
    latest,
    changedFields,
    clear,
    refreshNow: () => {
      context.refetch();
      if (conversationId) summary.refetch();
    },
  };
}
