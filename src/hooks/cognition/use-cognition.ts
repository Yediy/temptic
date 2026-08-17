// WOIC Cognitive Control & Observability client (PC-6.0B).
//
// Transport only. Every read is a call into the Phase 6.0A Cognitive Control
// API (`woic-cognitive-control`). No reasoning, memory, model routing, evidence
// scoring, claim evaluation or faculty orchestration happens here. When a 6.0A
// capability is not deployed the hook reports `pending` and the UI renders
// BACKEND CAPABILITY PENDING — it never substitutes synthetic cognition.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  COGNITION_SETTINGS_KEY, COGNITIVE_CONTROL_FUNCTION, DEFAULT_COGNITION_SETTINGS,
  asArray, asRecord, capabilityByKey, readJson, redactPrivateReasoning, writeJson,
  type AppRoleLike, type CognitionCapabilityKey, type CognitionSettings,
} from "@/lib/cognition/platform";

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

/** Single governed call into the Cognitive Control API (6.0A). */
export async function callCognitiveControl<T>(
  agencyId: string,
  capability: CognitionCapabilityKey,
  params: Record<string, unknown> = {},
): Promise<T> {
  const def = capabilityByKey(capability);
  const { data, error } = await supabase.functions.invoke(COGNITIVE_CONTROL_FUNCTION, {
    body: { agency_id: agencyId, capability, method: def.method, params, contract: "PC-6.0B" },
  });

  if (error) {
    const status = (error as { context?: { status?: number } })?.context?.status;
    if (status === 403) throw new CapabilityForbidden("You are not authorized for this cognitive capability.");
    if (status === 404 || status === 501 || status === undefined) {
      throw new CapabilityPending("The Phase 6.0A Cognitive Control API is not deployed in this environment.");
    }
    throw new Error(error.message || "The Cognitive Control API returned an error.");
  }

  const body = asRecord(data);
  const code = String(body.code ?? "");
  if (code === "not_implemented" || code === "capability_pending") {
    throw new CapabilityPending(String(body.error ?? "Capability pending."));
  }
  if (code === "forbidden") throw new CapabilityForbidden(String(body.error ?? "Forbidden."));
  if (body.error) throw new Error(String(body.error));
  // Private chain-of-thought is stripped at the transport boundary.
  return redactPrivateReasoning((body.data ?? body) as T);
}

export function useCognitiveCapability<T = unknown>(
  capability: CognitionCapabilityKey,
  params: Record<string, unknown> = {},
  options: { enabled?: boolean; refetchInterval?: number } = {},
): CapabilityResult<T> {
  const { agencyId } = useAuth();
  const enabled = (options.enabled ?? true) && !!agencyId;

  const query = useQuery({
    queryKey: ["cognition", capability, agencyId, params],
    queryFn: () => callCognitiveControl<T>(agencyId as string, capability, params),
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
export function useCognitiveList(
  capability: CognitionCapabilityKey,
  params: Record<string, unknown> = {},
  options: { enabled?: boolean; refetchInterval?: number } = {},
) {
  const result = useCognitiveCapability<unknown>(capability, params, options);
  const rows = useMemo(() => {
    const d = result.data;
    if (Array.isArray(d)) return asArray(d);
    const rec = asRecord(d);
    for (const key of ["items", "rows", "results", "records", "data"]) {
      if (Array.isArray(rec[key])) return asArray(rec[key]);
    }
    return [];
  }, [result.data]);
  return { ...result, rows };
}

/* ------------------------------------------------------------ governed write */

export function useCognitiveMutation(capability: CognitionCapabilityKey) {
  const { agencyId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => {
      if (!agencyId) throw new Error("No organization context available.");
      return callCognitiveControl<Record<string, unknown>>(agencyId, capability, params);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cognition"] }),
  });
}

/* ------------------------------------------------------------------ permissions */

export function useCognitionPermissions() {
  const { roles } = useAuth();
  const has = useCallback(
    (required: AppRoleLike[]) => required.some((r) => (roles as string[]).includes(r)),
    [roles],
  );
  return {
    roles: roles as string[],
    can: (capability: CognitionCapabilityKey) => has(capabilityByKey(capability).roles),
    canEngineering: has(["super_admin"]),
    canTenantBudgets: has(["agency_admin", "super_admin"]),
  };
}

/* --------------------------------------------------------------- settings */

export function useCognitionSettings(): [CognitionSettings, (s: CognitionSettings) => void] {
  const [settings, setSettings] = useState<CognitionSettings>(() =>
    readJson(COGNITION_SETTINGS_KEY, DEFAULT_COGNITION_SETTINGS));
  useEffect(() => { writeJson(COGNITION_SETTINGS_KEY, settings); }, [settings]);
  return [settings, setSettings];
}

/* ------------------------------------------------- client-side list filtering */

/** Presentation filtering only — never a re-ranking of cognitive output. */
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
