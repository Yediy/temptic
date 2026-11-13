// Context Packs over real WOIC storage: woic_cognitive_requests + linked woic_reasoning_traces (RLS-scoped).
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { buildContextPack, type ContextPack } from "@/lib/perception/context-pack";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export function useContextPacks(limit = 200) {
  const { agencyId } = useAuth();
  return useQuery({
    queryKey: ["context-packs", agencyId, limit],
    enabled: !!agencyId,
    queryFn: async (): Promise<ContextPack[]> => {
      const { data, error } = await sb.from("woic_cognitive_requests")
        .select("id,agency_id,service,operation,input,output,status,error,latency_ms,model,cached,created_at")
        .eq("agency_id", agencyId).order("created_at", { ascending: false }).limit(limit);
      if (error) throw new Error(error.message);
      const reqs = (data ?? []) as Record<string, unknown>[];
      const traceIds = reqs.map((r) => (r.output as Record<string, unknown> | null)?.trace_id).filter((x): x is string => typeof x === "string");
      let traces: Record<string, unknown>[] = [];
      if (traceIds.length) {
        const { data: t } = await sb.from("woic_reasoning_traces").select("*").in("id", traceIds);
        traces = (t ?? []) as Record<string, unknown>[];
      }
      const byId = new Map(traces.map((t) => [String(t.id), t]));
      return reqs.map((r) => buildContextPack(r, byId.get(String((r.output as Record<string, unknown> | null)?.trace_id)) ?? null));
    },
  });
}
