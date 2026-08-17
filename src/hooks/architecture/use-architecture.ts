// Architecture & Governance Console client (PC-5.10B).
//
// Transport only. Every read is a call into the canonical Phase 5.10A
// Architecture Registry (`architecture-api`). There is no second architecture
// store, no local dependency analysis and no fabricated metadata: when the
// registry does not serve a capability the hook reports `pending` and the UI
// renders ARCHITECTURE REGISTRY UNAVAILABLE.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cognitive } from "@/hooks/woic/use-cognitive";
import {
  ARCHITECTURE_REGISTRY_FUNCTION, ARCH_SETTINGS_KEY, DEFAULT_ARCH_SETTINGS,
  ENGINEER_TASKS, asArray, asRecord, capabilityByKey, readJson, writeJson,
  type AppRoleLike, type ArchCapabilityKey, type ArchSettings, type EngineerTask,
} from "@/lib/architecture/platform";

export type RegistryStatus = "loading" | "ok" | "pending" | "forbidden" | "error" | "idle";

export interface RegistryResult<T> {
  data: T | null;
  status: RegistryStatus;
  message: string | null;
  refetch: () => void;
  isFetching: boolean;
}

class RegistryPending extends Error {}
class RegistryForbidden extends Error {}

/** Single governed call into the canonical Architecture Registry. */
export async function callRegistry<T>(
  agencyId: string,
  capability: ArchCapabilityKey,
  params: Record<string, unknown> = {},
): Promise<T> {
  const def = capabilityByKey(capability);
  const { data, error } = await supabase.functions.invoke(ARCHITECTURE_REGISTRY_FUNCTION, {
    body: { agency_id: agencyId, capability, method: def.method, params, contract: "PC-5.10B" },
  });

  if (error) {
    const status = (error as { context?: { status?: number } })?.context?.status;
    if (status === 403) throw new RegistryForbidden("You are not authorized for this registry capability.");
    if (status === 404 || status === 501 || status === undefined) {
      throw new RegistryPending("The Phase 5.10A Architecture Registry is not deployed in this environment.");
    }
    throw new Error(error.message || "The Architecture Registry returned an error.");
  }

  const body = asRecord(data);
  const code = String(body.code ?? "");
  if (code === "not_implemented" || code === "capability_pending") {
    throw new RegistryPending(String(body.error ?? "Registry capability pending."));
  }
  if (code === "forbidden") throw new RegistryForbidden(String(body.error ?? "Forbidden."));
  if (body.error) throw new Error(String(body.error));
  return (body.data ?? body) as T;
}

export function useRegistry<T = unknown>(
  capability: ArchCapabilityKey,
  params: Record<string, unknown> = {},
  options: { enabled?: boolean; refetchInterval?: number } = {},
): RegistryResult<T> {
  const { agencyId } = useAuth();
  const enabled = (options.enabled ?? true) && !!agencyId;

  const query = useQuery({
    queryKey: ["architecture", capability, agencyId, params],
    queryFn: () => callRegistry<T>(agencyId as string, capability, params),
    enabled,
    retry: false,
    refetchInterval: options.refetchInterval,
  });

  let status: RegistryStatus = "idle";
  if (!enabled) status = "idle";
  else if (query.isLoading) status = "loading";
  else if (query.error instanceof RegistryPending) status = "pending";
  else if (query.error instanceof RegistryForbidden) status = "forbidden";
  else if (query.error) status = "error";
  else status = "ok";

  return {
    data: (query.data ?? null) as T | null,
    status,
    message: query.error instanceof Error ? query.error.message : null,
    refetch: () => void query.refetch(),
    isFetching: query.isFetching,
  };
}

/** Registry read normalised to a row list, whatever envelope the registry uses. */
export function useRegistryList(
  capability: ArchCapabilityKey,
  params: Record<string, unknown> = {},
  options: { enabled?: boolean; refetchInterval?: number } = {},
) {
  const result = useRegistry<unknown>(capability, params, options);
  const rows = useMemo(() => {
    const d = result.data;
    if (Array.isArray(d)) return asArray(d);
    const rec = asRecord(d);
    for (const key of ["items", "rows", "results", "records", "data", "entries"]) {
      if (Array.isArray(rec[key])) return asArray(rec[key]);
    }
    return [];
  }, [result.data]);
  return { ...result, rows };
}

/* ------------------------------------------------------------------ permissions */

export function useArchPermissions() {
  const { roles } = useAuth();
  const has = useCallback(
    (required: AppRoleLike[]) => required.some((r) => (roles as string[]).includes(r)),
    [roles],
  );
  return {
    roles: roles as string[],
    can: (capability: ArchCapabilityKey) => has(capabilityByKey(capability).roles),
    canViewIp: has(["super_admin"]),
    isSuperAdmin: has(["super_admin"]),
  };
}

/* --------------------------------------------------------------- settings */

export function useArchSettings(): [ArchSettings, (s: ArchSettings) => void] {
  const [settings, setSettings] = useState<ArchSettings>(() =>
    readJson(ARCH_SETTINGS_KEY, DEFAULT_ARCH_SETTINGS));
  useEffect(() => { writeJson(ARCH_SETTINGS_KEY, settings); }, [settings]);
  return [settings, setSettings];
}

/* --------------------------------------------------- WOIC engineering assistant */

export function useEngineeringAssistant() {
  const { agencyId } = useAuth();
  const [pending, setPending] = useState(false);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(async (task: EngineerTask, context: unknown, question?: string) => {
    if (!agencyId) { setError("No organization context available."); return; }
    const spec = ENGINEER_TASKS.find((t) => t.key === task);
    setPending(true); setError(null); setAnswer("");
    try {
      const data = await cognitive<Record<string, unknown>>(agencyId, "reason", {
        question: [
          spec?.prompt ?? "",
          question ? `Engineer question: ${question}` : "",
          "You may only use the Architecture Registry records supplied below. Cite the registry ids you used. If the records do not answer the question, reply that the Architecture Registry does not document it.",
          `Architecture Registry records (JSON):\n${JSON.stringify(context).slice(0, 12000)}`,
        ].filter(Boolean).join("\n\n"),
        subject: "platform_architecture",
        scope: "architecture",
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
