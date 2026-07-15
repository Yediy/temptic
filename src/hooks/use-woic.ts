// WOIC client hooks — thin wrappers over the woic-* edge functions.
// All calls flow through supabase.functions.invoke, so auth + tenancy are
// enforced server-side by requireUser + requireAgencyMember.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type ApiParams = Record<string, unknown>;

async function callWoicApi<T = unknown>(
  service: string,
  action: string,
  agencyId: string,
  params: ApiParams = {},
): Promise<T> {
  const { data, error } = await supabase.functions.invoke("woic-api", {
    body: { service, action, agency_id: agencyId, params },
  });
  if (error) throw error;
  if (data && typeof data === "object" && "error" in data && (data as any).error) {
    throw new Error(String((data as any).error));
  }
  return (data?.data ?? data) as T;
}

// ---------- Identity ----------
export function useWoicIdentity(agencyId: string | undefined, identityId: string | undefined) {
  return useQuery({
    queryKey: ["woic", "identity", agencyId, identityId],
    enabled: !!agencyId && !!identityId,
    queryFn: () => callWoicApi("identity", "get", agencyId!, { identity_id: identityId }),
  });
}

export function useWoicIdentityMemberships(agencyId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ["woic", "identity_memberships", agencyId, limit],
    enabled: !!agencyId,
    queryFn: () => callWoicApi<any[]>("identity", "list_memberships", agencyId!, { limit }),
  });
}

// ---------- Recommendations ----------
export interface WoicRecommendationFilter {
  subject_entity?: string;
  subject_id?: string;
  limit?: number;
}
export function useWoicRecommendations(agencyId: string | undefined, filter: WoicRecommendationFilter = {}) {
  return useQuery({
    queryKey: ["woic", "recommendations", agencyId, filter],
    enabled: !!agencyId,
    queryFn: () => callWoicApi<any[]>("recommendation", "list", agencyId!, { ...filter }),
  });
}

export function useRunWoicRecommend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      agency_id: string;
      subject_entity: "job" | "worker";
      subject_id: string;
      limit?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke("woic-recommend", { body: input });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["woic", "recommendations", vars.agency_id] });
    },
  });
}

// ---------- Compliance ----------
export function useWoicComplianceAlerts(agencyId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ["woic", "compliance_events", agencyId, limit],
    enabled: !!agencyId,
    queryFn: () => callWoicApi<any[]>("compliance", "events", agencyId!, { limit }),
    refetchInterval: 60_000,
  });
}

// ---------- Conversation Summaries ----------
export function useSummarizeConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { agency_id: string; conversation_id: string }) => {
      const { data, error } = await supabase.functions.invoke("woic-conversation-summarize", {
        body: input,
      });
      if (error) throw error;
      return data as { summary: string; conversation_id: string };
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["woic", "conversation", vars.conversation_id] });
    },
  });
}

// ---------- Context session ----------
export function useWoicContext(agencyId: string | undefined) {
  return useQuery({
    queryKey: ["woic", "context", agencyId],
    enabled: !!agencyId,
    queryFn: () => callWoicApi("context", "get", agencyId!),
  });
}

export function useSetWoicContext() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      agency_id: string;
      current_worker_id?: string | null;
      current_client_id?: string | null;
      current_job_id?: string | null;
      current_workflow?: string | null;
      active_role?: string | null;
    }) => {
      const { agency_id, ...patch } = input;
      return callWoicApi("context", "set", agency_id, patch);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["woic", "context", vars.agency_id] });
    },
  });
}

// ---------- Knowledge search ----------
export function useWoicKnowledgeSearch(agencyId: string | undefined, q: string, limit = 25) {
  return useQuery({
    queryKey: ["woic", "knowledge", agencyId, q, limit],
    enabled: !!agencyId && q.trim().length > 0,
    queryFn: () => callWoicApi<any[]>("knowledge", "search", agencyId!, { q, limit }),
  });
}

// ---------- Decisions ----------
export function useWoicDecisions(agencyId: string | undefined, limit = 25) {
  return useQuery({
    queryKey: ["woic", "decisions", agencyId, limit],
    enabled: !!agencyId,
    queryFn: () => callWoicApi<any[]>("decision", "list", agencyId!, { limit }),
  });
}

// ---------- Learning ----------
export function useWoicLearningHistory(agencyId: string | undefined, limit = 100) {
  return useQuery({
    queryKey: ["woic", "learning", agencyId, limit],
    enabled: !!agencyId,
    queryFn: () => callWoicApi<any[]>("learning", "list", agencyId!, { limit }),
  });
}

// ---------- Predictions ----------
export function useWoicPredictionModels(agencyId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ["woic", "prediction_models", agencyId, limit],
    enabled: !!agencyId,
    queryFn: () => callWoicApi<any[]>("prediction", "list_models", agencyId!, { limit }),
  });
}
export function useWoicPredictionResults(agencyId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ["woic", "prediction_results", agencyId, limit],
    enabled: !!agencyId,
    queryFn: () => callWoicApi<any[]>("prediction", "list_results", agencyId!, { limit }),
  });
}

// ---------- Registry ----------
export function useWoicRegistryServices(agencyId: string | undefined, limit = 100) {
  return useQuery({
    queryKey: ["woic", "registry_services", agencyId, limit],
    enabled: !!agencyId,
    queryFn: () => callWoicApi<any[]>("registry", "services", agencyId!, { limit }),
  });
}
export function useWoicRegistryApis(agencyId: string | undefined, limit = 100) {
  return useQuery({
    queryKey: ["woic", "registry_apis", agencyId, limit],
    enabled: !!agencyId,
    queryFn: () => callWoicApi<any[]>("registry", "apis", agencyId!, { limit }),
  });
}
