// WOIC Cognitive Memory client (PC-6.2B).
//
// Transport only. Every read and every operator control is a call into the
// Phase 6.2A Working Memory API (`woic-memory`). No working-memory logic,
// compression, eviction, scoring, checkpoint persistence, state merging or
// memory promotion happens here. When a 6.2A capability is not deployed the
// hook reports `pending` and the UI renders BACKEND CAPABILITY PENDING — it
// never substitutes synthetic memory.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  DEFAULT_MEMORY_SETTINGS, MEMORY_FUNCTION, MEMORY_SETTINGS_KEY,
  asArray, asRecord, capabilityByKey, readJson, redactPrivate, writeJson,
  type AppRoleLike, type MemoryCapabilityKey, type MemorySettings,
} from "@/lib/memory/platform";

export type CapabilityStatus = "loading" | "ok" | "pending" | "forbidden" | "error" | "idle";

export interface CapabilityResult<T> {
  data: T | null;
  status: CapabilityStatus;
  message: string | null;
  refetch: () => void;
  isFetching: boolean;
}

class CapabilityPending extends Error {}
class CapabilityForbidden extends Error {}

/** Single governed call into the Working Memory API (6.2A). */
export async function callMemory<T>(
  agencyId: string,
  capability: MemoryCapabilityKey,
  params: Record<string, unknown> = {},
): Promise<T> {
  const def = capabilityByKey(capability);
  const { data, error } = await supabase.functions.invoke(MEMORY_FUNCTION, {
    body: { agency_id: agencyId, capability, method: def.method, params, contract: "PC-6.2B" },
  });

  if (error) {
    const status = (error as { context?: { status?: number } })?.context?.status;
    if (status === 403) throw new CapabilityForbidden("You are not authorized for this working-memory capability.");
    if (status === 404 || status === 501 || status === undefined) {
      throw new CapabilityPending("The Phase 6.2A Working Memory API is not deployed in this environment.");
    }
    throw new Error(error.message || "The Working Memory API returned an error.");
  }

  const body = asRecord(data);
  const code = String(body.code ?? "");
  if (code === "not_implemented" || code === "capability_pending") {
    throw new CapabilityPending(String(body.error ?? "Capability pending."));
  }
  if (code === "forbidden") throw new CapabilityForbidden(String(body.error ?? "Forbidden."));
  if (body.error) throw new Error(String(body.error));
  // Private chain-of-thought is stripped at the transport boundary.
  return redactPrivate((body.data ?? body) as T);
}

export function useMemoryCapability<T = unknown>(
  capability: MemoryCapabilityKey,
  params: Record<string, unknown> = {},
  options: { enabled?: boolean; refetchInterval?: number | false } = {},
): CapabilityResult<T> {
  const { agencyId } = useAuth();
  const enabled = (options.enabled ?? true) && !!agencyId;

  const query = useQuery({
    queryKey: ["woic-memory", capability, agencyId, params],
    queryFn: () => callMemory<T>(agencyId as string, capability, params),
    enabled,
    retry: false,
    refetchInterval: options.refetchInterval,
  });

  let status: CapabilityStatus = "idle";
  if (!enabled) status = "idle";
  else if (query.isLoading) status = "loading";
  else if (query.error instanceof CapabilityPending) status = "pending";
  else if (query.error instanceof CapabilityForbidden) status = "forbidden";
  else if (query.error) status = "error";
  else status = "ok";

  return {
    data: (query.data as T) ?? null,
    status,
    message: query.error instanceof Error ? query.error.message : null,
    refetch: () => void query.refetch(),
    isFetching: query.isFetching,
  };
}

/** Capability that returns a collection. */
export function useMemoryList(
  capability: MemoryCapabilityKey,
  params: Record<string, unknown> = {},
  options: { enabled?: boolean; refetchInterval?: number | false } = {},
) {
  const result = useMemoryCapability<unknown>(capability, params, options);
  const rows = useMemo(() => {
    const d = result.data;
    if (Array.isArray(d)) return asArray(d);
    const rec = asRecord(d);
    for (const key of ["items", "rows", "results", "records", "sessions", "checkpoints", "events", "data"]) {
      if (Array.isArray(rec[key])) return asArray(rec[key]);
    }
    return [];
  }, [result.data]);
  return { ...result, rows };
}

/* ------------------------------------------------------------ governed write */

/**
 * Operator controls. The frontend only *requests* the operation; pausing,
 * checkpointing and restoration are performed entirely by 6.2A.
 */
export function useMemoryControl(capability: MemoryCapabilityKey) {
  const { agencyId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => {
      if (!agencyId) throw new Error("No organization context available.");
      return callMemory<Record<string, unknown>>(agencyId, capability, params);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["woic-memory"] }),
  });
}

/* ------------------------------------------------------------------ permissions */

export function useMemoryPermissions() {
  const { roles } = useAuth();
  const has = useCallback(
    (required: AppRoleLike[]) => required.some((r) => (roles as string[]).includes(r)),
    [roles],
  );
  return {
    roles: roles as string[],
    can: (capability: MemoryCapabilityKey) => has(capabilityByKey(capability).roles),
    canControlSessions: has(["agency_admin", "super_admin"]),
    canRestoreCheckpoint: has(["super_admin"]),
    canEngineering: has(["super_admin"]),
  };
}

/* --------------------------------------------------------------- settings */

export function useMemorySettings(): [MemorySettings, (s: MemorySettings) => void] {
  const [settings, setSettings] = useState<MemorySettings>(() =>
    readJson(MEMORY_SETTINGS_KEY, DEFAULT_MEMORY_SETTINGS));
  useEffect(() => { writeJson(MEMORY_SETTINGS_KEY, settings); }, [settings]);
  return [settings, setSettings];
}

/* ------------------------------------------------- client-side list filtering */

/** Presentation filtering only — never a re-ranking of memory output. */
export function useRowFilter(rows: Record<string, unknown>[], query: string, fields?: string[]) {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const entries = fields ? fields.map((f) => row[f]) : Object.values(row);
      return entries.some((v) => String(v ?? "").toLowerCase().includes(q));
    });
  }, [rows, query, fields]);
}
