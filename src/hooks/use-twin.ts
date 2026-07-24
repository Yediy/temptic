// Digital Worker Twin hooks (IWOS 4.4). Thin wrappers over Supabase reads;
// writes flow through the twin-recompute edge function.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useWorkerTwin(workerId: string | undefined) {
  return useQuery({
    queryKey: ["twin", "root", workerId],
    enabled: !!workerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("worker_twins")
        .select("*")
        .eq("worker_id", workerId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useTwinCapabilities(twinId: string | undefined) {
  return useQuery({
    queryKey: ["twin", "capabilities", twinId],
    enabled: !!twinId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("twin_capabilities")
        .select("*")
        .eq("twin_id", twinId!)
        .order("proficiency", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTwinPredictions(twinId: string | undefined) {
  return useQuery({
    queryKey: ["twin", "predictions", twinId],
    enabled: !!twinId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("twin_predictions")
        .select("*")
        .eq("twin_id", twinId!)
        .order("produced_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTwinLearningEvents(twinId: string | undefined) {
  return useQuery({
    queryKey: ["twin", "learning", twinId],
    enabled: !!twinId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("twin_learning_events")
        .select("*")
        .eq("twin_id", twinId!)
        .order("occurred_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTwinRecommendations(twinId: string | undefined) {
  return useQuery({
    queryKey: ["twin", "recommendations", twinId],
    enabled: !!twinId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("twin_recommendations")
        .select("*")
        .eq("twin_id", twinId!)
        .order("score", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCareerSimulations(twinId: string | undefined) {
  return useQuery({
    queryKey: ["twin", "career_sims", twinId],
    enabled: !!twinId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("career_simulations")
        .select("*")
        .eq("twin_id", twinId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAssignmentSimulations(twinId: string | undefined) {
  return useQuery({
    queryKey: ["twin", "asg_sims", twinId],
    enabled: !!twinId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignment_simulations")
        .select("*")
        .eq("twin_id", twinId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useGrowthPlan(twinId: string | undefined) {
  return useQuery({
    queryKey: ["twin", "growth", twinId],
    enabled: !!twinId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("growth_plans")
        .select("*")
        .eq("twin_id", twinId!)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useKnowledgeGraph(agencyId: string | undefined) {
  return useQuery({
    queryKey: ["twin", "kg", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const [{ data: nodes, error: e1 }, { data: edges, error: e2 }] = await Promise.all([
        supabase.from("knowledge_graph_nodes").select("*").eq("agency_id", agencyId!).limit(200),
        supabase.from("knowledge_graph_edges").select("*").eq("agency_id", agencyId!).limit(500),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      return { nodes: nodes ?? [], edges: edges ?? [] };
    },
  });
}

export function useAgencyTwins(agencyId: string | undefined) {
  return useQuery({
    queryKey: ["twin", "agency_all", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("worker_twins")
        .select("id, worker_id, career_health, growth_score, future_potential, risk_indicators, updated_at, workers(first_name, last_name)")
        .eq("agency_id", agencyId!)
        .order("growth_score", { ascending: false, nullsFirst: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRecomputeTwin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { worker_id: string; agency_id: string; action?: string }) => {
      const { data, error } = await supabase.functions.invoke("twin-recompute", { body: input });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["twin", "root", v.worker_id] });
      qc.invalidateQueries({ queryKey: ["twin"] });
    },
  });
}
