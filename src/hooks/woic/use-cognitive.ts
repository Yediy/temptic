// WOIC Cognitive Core client API — the single entry point every module uses.
// Mirrors the unified WOIC API: Reason, Predict, Recommend, Explain, Learn,
// RetrieveKnowledge, StoreKnowledge, EvaluateCompliance, GenerateReport,
// GenerateCommunication, Simulate.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { streamCognitive, type StreamableOperation } from "@/lib/woic/stream";

export type CognitiveOperation =
  | "reason" | "predict" | "recommend" | "explain" | "learn"
  | "retrieve_knowledge" | "store_knowledge" | "evaluate_compliance"
  | "generate_report" | "generate_communication" | "simulate"
  | "security_scan" | "snapshot";

export async function cognitive<T = unknown>(
  agencyId: string,
  operation: CognitiveOperation,
  params: Record<string, unknown> = {},
  module = "console",
): Promise<T> {
  const { data, error } = await supabase.functions.invoke("woic-cognitive", {
    body: { agency_id: agencyId, operation, params },
    headers: { "x-woic-module": module },
  });
  if (error) throw error;
  if (data && typeof data === "object" && "error" in data && (data as { error?: string }).error) {
    throw new Error(String((data as { error: string }).error));
  }
  return ((data as { data?: T })?.data ?? data) as T;
}

function useCognitiveMutation<T>(operation: CognitiveOperation, invalidate: string[][] = []) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { agency_id: string } & Record<string, unknown>) => {
      const { agency_id, ...params } = vars;
      return cognitive<T>(agency_id, operation, params);
    },
    onSuccess: () => invalidate.forEach((key) => qc.invalidateQueries({ queryKey: key })),
  });
}

export const useReason = () => useCognitiveMutation<Record<string, unknown>>("reason", [["woic", "reasoning"]]);
export const usePredict = () => useCognitiveMutation<Record<string, unknown>>("predict", [["woic", "prediction_results"]]);
export const useRecommend = () => useCognitiveMutation<Record<string, unknown>>("recommend", [["woic", "recommendations"]]);
export const useExplain = () => useCognitiveMutation<Record<string, unknown>>("explain");
export const useLearn = () => useCognitiveMutation<Record<string, unknown>>("learn", [["woic", "learning"], ["woic", "recommendations"]]);
export const useStoreKnowledge = () => useCognitiveMutation<Record<string, unknown>>("store_knowledge", [["woic", "memory"]]);
export const useEvaluateCompliance = () => useCognitiveMutation<Record<string, unknown>>("evaluate_compliance");
export const useGenerateReport = () => useCognitiveMutation<Record<string, unknown>>("generate_report", [["woic", "briefs"]]);
export const useGenerateCommunication = () => useCognitiveMutation<Record<string, unknown>>("generate_communication", [["woic", "communications"]]);
export const useSimulate = () => useCognitiveMutation<Record<string, unknown>>("simulate", [["woic", "simulations"]]);
export const useSecurityScan = () => useCognitiveMutation<Record<string, unknown>>("security_scan", [["woic", "security_signals"]]);
// ---- Streaming Reason / Explain / GenerateReport ----
export function useCognitiveStream<T = Record<string, unknown>>(operation: StreamableOperation, invalidate: string[][] = []) {
  const qc = useQueryClient();
  const [state, setState] = useState<{ stage: string; text: string; isStreaming: boolean; data?: T; error?: string }>({
    stage: "", text: "", isStreaming: false,
  });
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async (agencyId: string, params: Record<string, unknown>) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState({ stage: "connecting", text: "", isStreaming: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Please sign in again.");
      const data = await streamCognitive<T>({
        url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/woic-cognitive`,
        accessToken: session.access_token,
        apiKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        agencyId, operation, params, signal: ctrl.signal,
        onStatus: (stage) => setState((s) => ({ ...s, stage })),
        onDelta: (_t, full) => setState((s) => ({ ...s, text: full, stage: "generating" })),
      });
      setState((s) => ({ ...s, data, stage: "done", isStreaming: false }));
      invalidate.forEach((key) => qc.invalidateQueries({ queryKey: key }));
      return data;
    } catch (e) {
      if (ctrl.signal.aborted) { setState((s) => ({ ...s, stage: "cancelled", isStreaming: false })); return undefined; }
      const error = e instanceof Error ? e.message : String(e);
      setState((s) => ({ ...s, error, stage: "error", isStreaming: false }));
      throw e;
    }
  }, [operation, qc, invalidate]);

  const cancel = useCallback(() => abortRef.current?.abort(), []);
  useEffect(() => () => abortRef.current?.abort(), []);
  return { ...state, start, cancel };
}

export const useIngestEvents = () =>
  useMutation({
    mutationFn: async (vars: { agency_id: string; limit?: number }) => {
      const { data, error } = await supabase.functions.invoke("woic-ingest-events", { body: vars });
      if (error) throw error;
      return data;
    },
  });

export function useOrgSnapshot(agencyId: string | undefined) {
  return useQuery({
    queryKey: ["woic", "snapshot", agencyId],
    enabled: !!agencyId,
    queryFn: () => cognitive<Record<string, unknown>>(agencyId!, "snapshot"),
    refetchInterval: 120_000,
  });
}

// ---- Read models over cognitive storage (RLS-scoped) ----
function useAgencyTable<T>(key: string, table: string, agencyId?: string, orderBy = "created_at", limit = 50) {
  return useQuery({
    queryKey: ["woic", key, agencyId, limit],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table as never)
        .select("*")
        .eq("agency_id", agencyId!)
        .order(orderBy, { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

export const useReasoningTraces = (agencyId?: string, limit = 50) =>
  useAgencyTable<Record<string, unknown>>("reasoning", "woic_reasoning_traces", agencyId, "created_at", limit);
export const useCognitiveMemory = (agencyId?: string, limit = 100) =>
  useAgencyTable<Record<string, unknown>>("memory", "woic_memory", agencyId, "created_at", limit);
export const useExecutiveBriefs = (agencyId?: string, limit = 30) =>
  useAgencyTable<Record<string, unknown>>("briefs", "woic_executive_briefs", agencyId, "created_at", limit);
export const useCognitiveCommunications = (agencyId?: string, limit = 50) =>
  useAgencyTable<Record<string, unknown>>("communications", "woic_communications", agencyId, "created_at", limit);
export const useSecuritySignals = (agencyId?: string, limit = 50) =>
  useAgencyTable<Record<string, unknown>>("security_signals", "woic_security_signals", agencyId, "detected_at", limit);
export const useSimulations = (agencyId?: string, limit = 30) =>
  useAgencyTable<Record<string, unknown>>("simulations", "woic_simulations", agencyId, "created_at", limit);
export const useCognitiveRequests = (agencyId?: string, limit = 100) =>
  useAgencyTable<Record<string, unknown>>("cognitive_requests", "woic_cognitive_requests", agencyId, "created_at", limit);
