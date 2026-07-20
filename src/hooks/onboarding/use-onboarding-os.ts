import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AssignmentReadiness, ClientRequirement, OnboardingSession } from "@/lib/onboarding/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const T = (s: string) => supabase.from(s as any);

export function useOnboardingSessions(agencyId?: string) {
  return useQuery({
    queryKey: ["onboarding-sessions", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await T("onboarding_sessions")
        .select("*, worker:workers(id, first_name, last_name, email)")
        .eq("agency_id", agencyId!)
        .order("last_activity_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown) as (OnboardingSession & { worker: any })[];
    },
  });
}

export function useWorkerSession(workerId?: string) {
  return useQuery({
    queryKey: ["onboarding-session", workerId],
    enabled: !!workerId,
    queryFn: async () => {
      const { data, error } = await T("onboarding_sessions")
        .select("*")
        .eq("worker_id", workerId!)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown) as OnboardingSession | null;
    },
  });
}

export function useUpsertSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<OnboardingSession> & { agency_id: string; worker_id: string }) => {
      const { data, error } = await T("onboarding_sessions")
        .upsert(input as any, { onConflict: "id" })
        .select()
        .single();
      if (error) throw error;
      return (data as unknown) as OnboardingSession;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding-sessions"] });
      qc.invalidateQueries({ queryKey: ["onboarding-session"] });
    },
  });
}

export function useClientRequirements(agencyId?: string) {
  return useQuery({
    queryKey: ["client-requirements", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await T("client_requirements")
        .select("*, client:clients(id, name)")
        .eq("agency_id", agencyId!)
        .order("name");
      if (error) throw error;
      return ((data ?? []) as unknown) as (ClientRequirement & { client: any })[];
    },
  });
}

export function useSaveClientRequirement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ClientRequirement> & { agency_id: string; client_id: string; name: string }) => {
      const { data, error } = await T("client_requirements").upsert(input as any).select().single();
      if (error) throw error;
      return (data as unknown) as ClientRequirement;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-requirements"] }),
  });
}

export function useReadiness(workerId?: string) {
  return useQuery({
    queryKey: ["assignment-readiness", workerId],
    enabled: !!workerId,
    queryFn: async () => {
      const { data, error } = await T("assignment_readiness")
        .select("*")
        .eq("worker_id", workerId!)
        .order("computed_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown) as AssignmentReadiness[];
    },
  });
}

export function useComputeReadiness() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { worker_id: string; client_id?: string | null }) => {
      const { data, error } = await supabase.functions.invoke("onboarding-readiness", { body: input });
      if (error) throw error;
      return data as { score: number; ready: boolean };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignment-readiness"] }),
  });
}

export function useOnboardingAssistant() {
  return useMutation({
    mutationFn: async (input: { worker_id?: string; question: string; context?: Record<string, unknown> }) => {
      const { data, error } = await supabase.functions.invoke("onboarding-assistant", { body: input });
      if (error) throw error;
      return data as { answer: string; next_actions?: string[] };
    },
  });
}
