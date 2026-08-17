// WOIC Perception & Context client (PC-6.1B).
//
// Transport only. Every read is a call into the Phase 6.1A Perception & Context
// API (`woic-perception`). No entity resolution, context scoring, relevance
// ranking, salience scoring, contradiction detection, evidence evaluation or
// reasoning happens here. When a 6.1A capability is not deployed the hook
// reports `pending` and the UI renders BACKEND CAPABILITY PENDING — it never
// substitutes synthetic perception.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  DEFAULT_PERCEPTION_SETTINGS, PERCEPTION_FUNCTION, PERCEPTION_PINS_KEY,
  PERCEPTION_SETTINGS_KEY, asArray, asRecord, capabilityByKey, readJson, redactPrivate, writeJson,
  type AppRoleLike, type PerceptionCapabilityKey, type PerceptionSettings,
} from "@/lib/perception/platform";

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

/** Single governed call into the Perception & Context API (6.1A). */
export async function callPerception<T>(
  agencyId: string,
  capability: PerceptionCapabilityKey,
  params: Record<string, unknown> = {},
): Promise<T> {
  const def = capabilityByKey(capability);
  const { data, error } = await supabase.functions.invoke(PERCEPTION_FUNCTION, {
    body: { agency_id: agencyId, capability, method: def.method, params, contract: "PC-6.1B" },
  });

  if (error) {
    const status = (error as { context?: { status?: number } })?.context?.status;
    if (status === 403) throw new CapabilityForbidden("You are not authorized for this perception capability.");
    if (status === 404 || status === 501 || status === undefined) {
      throw new CapabilityPending("The Phase 6.1A Perception & Context API is not deployed in this environment.");
    }
    throw new Error(error.message || "The Perception & Context API returned an error.");
  }

  const body = asRecord(data);
  const code = String(body.code ?? "");
  if (code === "not_implemented" || code === "capability_pending") {
    throw new CapabilityPending(String(body.error ?? "Capability pending."));
  }
  if (code === "forbidden") throw new CapabilityForbidden(String(body.error ?? "Forbidden."));
  if (body.error) throw new Error(String(body.error));
  // Private reasoning and restricted payloads are stripped at the transport boundary.
  return redactPrivate((body.data ?? body) as T);
}

export function usePerceptionCapability<T = unknown>(
  capability: PerceptionCapabilityKey,
  params: Record<string, unknown> = {},
  options: { enabled?: boolean; refetchInterval?: number | false } = {},
): CapabilityResult<T> {
  const { agencyId } = useAuth();
  const enabled = (options.enabled ?? true) && !!agencyId;

  const query = useQuery({
    queryKey: ["perception", capability, agencyId, params],
    queryFn: () => callPerception<T>(agencyId as string, capability, params),
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
export function usePerceptionList(
  capability: PerceptionCapabilityKey,
  params: Record<string, unknown> = {},
  options: { enabled?: boolean; refetchInterval?: number | false } = {},
) {
  const result = usePerceptionCapability<unknown>(capability, params, options);
  const rows = useMemo(() => {
    const d = result.data;
    if (Array.isArray(d)) return asArray(d);
    const rec = asRecord(d);
    for (const key of ["items", "rows", "results", "records", "observations", "data"]) {
      if (Array.isArray(rec[key])) return asArray(rec[key]);
    }
    return [];
  }, [result.data]);
  return { ...result, rows };
}

/* ------------------------------------------------------------------ permissions */

export function usePerceptionPermissions() {
  const { roles } = useAuth();
  const has = useCallback(
    (required: AppRoleLike[]) => required.some((r) => (roles as string[]).includes(r)),
    [roles],
  );
  return {
    roles: roles as string[],
    can: (capability: PerceptionCapabilityKey) => has(capabilityByKey(capability).roles),
    canPrivacyInspect: has(["agency_admin", "super_admin"]),
    canEngineering: has(["super_admin"]),
  };
}

/* --------------------------------------------------------------- settings */

export function usePerceptionSettings(): [PerceptionSettings, (s: PerceptionSettings) => void] {
  const [settings, setSettings] = useState<PerceptionSettings>(() =>
    readJson(PERCEPTION_SETTINGS_KEY, DEFAULT_PERCEPTION_SETTINGS));
  useEffect(() => { writeJson(PERCEPTION_SETTINGS_KEY, settings); }, [settings]);
  return [settings, setSettings];
}

/* ------------------------------------------------------------------- pins */

export function usePinnedObservations() {
  const [pins, setPins] = useState<string[]>(() => readJson<string[]>(PERCEPTION_PINS_KEY, []));
  useEffect(() => { writeJson(PERCEPTION_PINS_KEY, pins); }, [pins]);
  const toggle = useCallback((id: string) => {
    setPins((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }, []);
  return { pins, toggle, clear: () => setPins([]) };
}

/* ------------------------------------------------- client-side list filtering */

/** Presentation filtering only — never a re-ranking of perception output. */
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
