// Recruit OS client hooks. All calls are RLS-scoped and multi-tenant.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  RecruitCandidateScore, RecruitOpportunity, RecruitPipeline, RecruitPipelineEntry,
  RecruitPipelineStage, RecruitClientContact, RecruitTalentPreferences,
} from "@/lib/recruit/types";

// Candidates: reuse workers + join scores
export function useRecruitCandidates(agencyId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ["recruit", "candidates", agencyId, limit],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workers")
        .select("id, first_name, last_name, email, phone, status, agency_id, created_at")
        .eq("agency_id", agencyId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCandidateScore(agencyId: string | undefined, workerId: string | undefined) {
  return useQuery({
    queryKey: ["recruit", "score", agencyId, workerId],
    enabled: !!agencyId && !!workerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruit_candidate_scores")
        .select("*")
        .eq("agency_id", agencyId!)
        .eq("worker_id", workerId!)
        .maybeSingle();
      if (error) throw error;
      return data as RecruitCandidateScore | null;
    },
  });
}

export function useRecomputeScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { agency_id: string; worker_id: string }) => {
      const { data, error } = await supabase.functions.invoke("recruit-score-candidate", { body: input });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["recruit", "score", vars.agency_id, vars.worker_id] }),
  });
}

// Job orders (reuse existing job_orders table)
export function useJobOrders(agencyId: string | undefined) {
  return useQuery({
    queryKey: ["recruit", "job_orders", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_orders")
        .select("*")
        .eq("agency_id", agencyId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMatchJob() {
  return useMutation({
    mutationFn: async (input: { agency_id: string; job_order_id: string; limit?: number }) => {
      const { data, error } = await supabase.functions.invoke("recruit-match-job", { body: input });
      if (error) throw error;
      return data?.data ?? [];
    },
  });
}

// Pipelines
export function useRecruitPipelines(agencyId: string | undefined) {
  return useQuery({
    queryKey: ["recruit", "pipelines", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruit_pipelines")
        .select("*")
        .eq("agency_id", agencyId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as RecruitPipeline[];
    },
  });
}

export function useRecruitPipelineBoard(pipelineId: string | undefined) {
  return useQuery({
    queryKey: ["recruit", "pipeline_board", pipelineId],
    enabled: !!pipelineId,
    queryFn: async () => {
      const [stagesRes, entriesRes] = await Promise.all([
        supabase.from("recruit_pipeline_stages").select("*").eq("pipeline_id", pipelineId!).order("position"),
        supabase.from("recruit_pipeline_entries").select("*").eq("pipeline_id", pipelineId!),
      ]);
      if (stagesRes.error) throw stagesRes.error;
      if (entriesRes.error) throw entriesRes.error;
      return {
        stages: (stagesRes.data ?? []) as RecruitPipelineStage[],
        entries: (entriesRes.data ?? []) as RecruitPipelineEntry[],
      };
    },
  });
}

export function useAdvancePipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { agency_id: string; entry_id: string; stage_id: string; notes?: string; pipeline_id: string }) => {
      const { data, error } = await supabase.functions.invoke("recruit-pipeline-advance", {
        body: { agency_id: input.agency_id, entry_id: input.entry_id, stage_id: input.stage_id, notes: input.notes },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["recruit", "pipeline_board", vars.pipeline_id] }),
  });
}

// Marketplace
export function useMarketplaceOpportunities(agencyId: string | undefined) {
  return useQuery({
    queryKey: ["recruit", "marketplace", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruit_marketplace_opportunities")
        .select("*")
        .eq("agency_id", agencyId!)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as RecruitOpportunity[];
    },
  });
}

// Clients + contacts
export function useRecruitClients(agencyId: string | undefined) {
  return useQuery({
    queryKey: ["recruit", "clients", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, company_name, billing_email, billing_phone, agency_id, created_at, is_active")
        .eq("agency_id", agencyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
export function useClientContacts(agencyId: string | undefined, clientId: string | undefined) {
  return useQuery({
    queryKey: ["recruit", "contacts", agencyId, clientId],
    enabled: !!agencyId && !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruit_client_contacts")
        .select("*")
        .eq("agency_id", agencyId!)
        .eq("client_id", clientId!);
      if (error) throw error;
      return (data ?? []) as RecruitClientContact[];
    },
  });
}

// Interviews / placements (reuse existing)
export function useInterviews(agencyId: string | undefined) {
  return useQuery({
    queryKey: ["recruit", "interviews", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      // interviews is scoped through applications; RLS enforces tenancy.
      const { data, error } = await supabase
        .from("interviews")
        .select("*")
        .order("scheduled_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}
export function usePlacements(agencyId: string | undefined) {
  return useQuery({
    queryKey: ["recruit", "placements", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("placements")
        .select("*")
        .eq("agency_id", agencyId!)
        .order("start_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// AI recruiter assistant
export function useRecruiterAssistant() {
  return useMutation({
    mutationFn: async (input: {
      agency_id: string;
      task: "summarize_candidate" | "draft_message" | "next_actions" | "chat";
      context?: Record<string, unknown>;
      messages?: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    }) => {
      const { data, error } = await supabase.functions.invoke("recruit-recruiter-assistant", { body: input });
      if (error) throw error;
      return data?.data as { content: string; model?: string };
    },
  });
}

export type { RecruitTalentPreferences };
