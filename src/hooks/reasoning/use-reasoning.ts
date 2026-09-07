// WOIC Reasoning & Evidence client (PC-6.3B).
//
// Transport only. Every read and every operator request is a call into the
// Phase 6.3A Reasoning API (`woic-reasoning`). No reasoning, no conclusion
// derivation, no confidence scoring, no evidence weighting and no causal
// classification happens here. When a 6.3A capability is not deployed the hook
// reports `pending` and the UI renders BACKEND CAPABILITY PENDING — it never
// substitutes synthetic reasoning.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  DEFAULT_REASONING_SETTINGS, REASONING_FUNCTION, REASONING_SETTINGS_KEY,
  asArray, asRecord, capabilityByKey, readJson, redactPrivate, writeJson,
  type AppRoleLike, type ReasoningCapabilityKey, type ReasoningSettings,
} from "@/lib/reasoning/platform";

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

/** Single governed call into the Reasoning API (6.3A). */
export async function callReasoning<T>(
  agencyId: string,
  capability: ReasoningCapabilityKey,
  params: Record<string, unknown> = {},
): Promise<T> {
  const def = capabilityByKey(capability);
  const { data, error } = await supabase.functions.invoke(REASONING_FUNCTION, {
    body: { agency_id: agencyId, capability, method: def.method, params, contract: "PC-6.3B" },
  });

  if (error) {
    const status = (error as { context?: { status?: number } })?.context?.status;
    if (status === 403) throw new CapabilityForbidden("You are not authorized for this reasoning capability.");
    if (status === 404 || status === 501 || status === undefined) {
      throw new CapabilityPending("The Phase 6.3A Reasoning API is not deployed in this environment.");
    }
    throw new Error(error.message || "The Reasoning API returned an error.");
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

export function useReasoningCapability<T = unknown>(
  capability: ReasoningCapabilityKey,
  params: Record<string, unknown> = {},
  options: { enabled?: boolean; refetchInterval?: number | false } = {},
): CapabilityResult<T> {
  const { agencyId } = useAuth();
  const enabled = (options.enabled ?? true) && !!agencyId;

  const query = useQuery({
    queryKey: ["woic-reasoning", capability, agencyId, params],
    queryFn: () => callReasoning<T>(agencyId as string, capability, params),
    enabled,
    retry: false,
    refetchInterval: options.refetchInterval,
  });

  let status: CapabilityStatus;
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
export function useReasoningList(
  capability: ReasoningCapabilityKey,
  params: Record<string, unknown> = {},
  options: { enabled?: boolean; refetchInterval?: number | false } = {},
) {
  const result = useReasoningCapability<unknown>(capability, params, options);
  const rows = useMemo(() => {
    const d = result.data;
    if (Array.isArray(d)) return asArray(d);
    const rec = asRecord(d);
    for (const key of [
      "items", "rows", "results", "records", "requests", "conclusions", "hypotheses",
      "evidence", "contradictions", "alternatives", "reviews", "claims", "disagreements", "history", "data",
    ]) {
      if (Array.isArray(rec[key])) return asArray(rec[key]);
    }
    return [];
  }, [result.data]);
  return { ...result, rows };
}

/* ------------------------------------------------------------ governed write */

/**
 * Operator requests. The frontend only *asks*; critique, contradiction review,
 * escalation and every handoff are performed entirely by 6.3A.
 */
export function useReasoningAction(capability: ReasoningCapabilityKey) {
  const { agencyId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => {
      if (!agencyId) throw new Error("No organization context available.");
      return callReasoning<Record<string, unknown>>(agencyId, capability, params);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["woic-reasoning"] }),
  });
}

/* ------------------------------------------------------------------ permissions */

export function useReasoningPermissions() {
  const { roles } = useAuth();
  const has = useCallback(
    (required: AppRoleLike[]) => required.some((r) => (roles as string[]).includes(r)),
    [roles],
  );
  return {
    roles: roles as string[],
    can: (capability: ReasoningCapabilityKey) => has(capabilityByKey(capability).roles),
    canRequestCritique: has(["agency_admin", "super_admin"]),
    canResolveContradiction: has(["agency_admin", "super_admin"]),
    canHandoff: has(["agency_admin", "super_admin"]),
    canEngineering: has(["super_admin"]),
  };
}

/* --------------------------------------------------------------- settings */

export function useReasoningSettings(): [ReasoningSettings, (s: ReasoningSettings) => void] {
  const [settings, setSettings] = useState<ReasoningSettings>(() =>
    readJson(REASONING_SETTINGS_KEY, DEFAULT_REASONING_SETTINGS));
  useEffect(() => { writeJson(REASONING_SETTINGS_KEY, settings); }, [settings]);
  return [settings, setSettings];
}

/* ------------------------------------------------- client-side list filtering */

/** Presentation filtering only — never a re-ranking of reasoning output. */
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
