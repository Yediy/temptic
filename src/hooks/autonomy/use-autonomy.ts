// Autonomous Operations Workspace client (PC-5.9B).
//
// Transport only. Every read is a call into the Phase 5.9A Autonomous
// Coordination Engine (`autonomy-api`); every write is a governed engine
// mutation. When a 5.9A capability is not deployed the hook reports
// `pending` and the UI renders BACKEND CAPABILITY PENDING — it never
// substitutes synthetic coordination data.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cognitive } from "@/hooks/woic/use-cognitive";
import {
  AUTONOMY_ENGINE_FUNCTION, AUTONOMY_SETTINGS_KEY, DEFAULT_AUTONOMY_SETTINGS,
  asArray, asRecord, capabilityByKey, readJson, writeJson,
  type AppRoleLike, type AutonomyCapabilityKey, type AutonomySettings, type InterventionDef,
} from "@/lib/autonomy/platform";

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
type Any = any;

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

/** Single governed call into the Autonomous Coordination Engine. */
export async function callEngine<T>(
  agencyId: string,
  capability: AutonomyCapabilityKey,
  params: Record<string, unknown> = {},
): Promise<T> {
  const def = capabilityByKey(capability);
  const { data, error } = await supabase.functions.invoke(AUTONOMY_ENGINE_FUNCTION, {
    body: { agency_id: agencyId, capability, method: def.method, params, contract: "PC-5.9B" },
  });

  if (error) {
    const status = (error as { context?: { status?: number } })?.context?.status;
    if (status === 403) throw new CapabilityForbidden("You are not authorized for this capability.");
    if (status === 404 || status === 501 || status === undefined) {
      throw new CapabilityPending("Autonomous Coordination Engine capability is not deployed.");
    }
    throw new Error(error.message || "The Autonomous Coordination Engine returned an error.");
  }

  const body = asRecord(data);
  const code = String(body.code ?? "");
  if (code === "not_implemented" || code === "capability_pending") {
    throw new CapabilityPending(String(body.error ?? "Capability pending."));
  }
  if (code === "forbidden") throw new CapabilityForbidden(String(body.error ?? "Forbidden."));
  if (body.error) throw new Error(String(body.error));
  return (body.data ?? body) as T;
}

export function useCapability<T = unknown>(
  capability: AutonomyCapabilityKey,
  params: Record<string, unknown> = {},
  options: { enabled?: boolean; refetchInterval?: number } = {},
): CapabilityResult<T> {
  const { agencyId } = useAuth();
  const enabled = (options.enabled ?? true) && !!agencyId;

  const query = useQuery({
    queryKey: ["autonomy", capability, agencyId, params],
    queryFn: () => callEngine<T>(agencyId as string, capability, params),
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

/** Convenience: capability that returns a list. */
export function useCapabilityList(
  capability: AutonomyCapabilityKey,
  params: Record<string, unknown> = {},
  options: { enabled?: boolean; refetchInterval?: number } = {},
) {
  const result = useCapability<unknown>(capability, params, options);
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

/* ------------------------------------------------------------- governed writes */

export function useEngineMutation(capability: AutonomyCapabilityKey) {
  const { agencyId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => {
      if (!agencyId) throw new Error("No organization context available.");
      return callEngine<Record<string, unknown>>(agencyId, capability, params);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["autonomy"] }),
  });
}

/* ------------------------------------------------------------------ permissions */

export function useAutonomyPermissions() {
  const { roles } = useAuth();
  const has = useCallback(
    (required: AppRoleLike[]) => required.some((r) => (roles as string[]).includes(r)),
    [roles],
  );
  return {
    roles: roles as string[],
    can: (capability: AutonomyCapabilityKey) => has(capabilityByKey(capability).roles),
    canIntervene: (def: InterventionDef) => has(def.roles),
    canEngineering: has(["super_admin"]),
    canGlobalKill: has(["super_admin"]),
  };
}

/* --------------------------------------------------------------- settings */

export function useAutonomySettings(): [AutonomySettings, (s: AutonomySettings) => void] {
  const [settings, setSettings] = useState<AutonomySettings>(() =>
    readJson(AUTONOMY_SETTINGS_KEY, DEFAULT_AUTONOMY_SETTINGS));
  useEffect(() => { writeJson(AUTONOMY_SETTINGS_KEY, settings); }, [settings]);
  return [settings, setSettings];
}

/* ------------------------------------------------- live event fabric stream */

export interface FabricEvent {
  id: string;
  name: string;
  module: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Real operational events from the existing Event Fabric (`ttos_events`).
 * These are production events — simulation artifacts are excluded by module.
 */
export function useAutonomyEventStream(limit = 60, refetchInterval = 10000) {
  const { agencyId } = useAuth();
  return useQuery({
    queryKey: ["autonomy", "events", agencyId, limit],
    enabled: !!agencyId,
    refetchInterval,
    queryFn: async (): Promise<FabricEvent[]> => {
      const { data, error } = await supabase
        .from("ttos_events" as Any)
        .select("id,name,module,entity_type,entity_id,metadata,created_at")
        .eq("agency_id", agencyId as string)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as FabricEvent[];
    },
  });
}

/* ---------------------------------------------------- WOIC operations assistant */

export const OPS_ASSISTANT_TASKS = [
  { key: "whats_happening", label: "What is happening?", prompt: "Summarize current autonomous operations: what is running, what is waiting and what needs a human." },
  { key: "why_paused", label: "Why is this paused?", prompt: "Explain precisely why this operation is paused, who paused it and what is required to resume." },
  { key: "needs_me", label: "Which operations need me?", prompt: "List the operations requiring my attention now, ordered by urgency, with the reason for each." },
  { key: "highest_risk", label: "What is our highest risk?", prompt: "Identify the highest current operational risk, its evidence and the recommended human action." },
  { key: "why_escalated", label: "Why did WOIC escalate this?", prompt: "Explain the escalation: the trigger, the confidence gap, the authority gap and the policy involved." },
  { key: "stop_impact", label: "What happens if I stop this?", prompt: "Explain the consequences of stopping this operation now: work lost, dependencies broken, reversibility and recovery." },
  { key: "underperforming", label: "Which actor is underperforming?", prompt: "Identify underperforming actors with the evidence behind that judgement." },
  { key: "actor_actions", label: "Show every action this actor took", prompt: "Summarize every action this actor took in the period, with authority reference and outcome." },
  { key: "explain_authority", label: "Explain this authority envelope", prompt: "Explain this authority envelope in plain language: what it permits, what it forbids and where its limits bind." },
] as const;

export type OpsAssistantTask = typeof OPS_ASSISTANT_TASKS[number]["key"];

export function useOpsAssistant() {
  const { agencyId } = useAuth();
  const [pending, setPending] = useState(false);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(async (task: OpsAssistantTask, context: unknown) => {
    if (!agencyId) { setError("No organization context available."); return; }
    const spec = OPS_ASSISTANT_TASKS.find((t) => t.key === task);
    setPending(true); setError(null); setAnswer("");
    try {
      const data = await cognitive<Record<string, unknown>>(agencyId, "reason", {
        question: `${spec?.prompt ?? ""}\n\nAutonomous operations context (JSON):\n${JSON.stringify(context).slice(0, 12000)}`,
        subject: "autonomous_operations",
        scope: "autonomy",
      });
      setAnswer(String(data.answer ?? data.explanation ?? data.summary ?? JSON.stringify(data).slice(0, 4000)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "WOIC is unavailable.");
    } finally {
      setPending(false);
    }
  }, [agencyId]);

  return { ask, pending, answer, error, reset: () => setAnswer("") };
}
