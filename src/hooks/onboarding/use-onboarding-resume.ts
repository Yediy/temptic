import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ONBOARDING_STEPS, type OnboardingSession, type OnboardingStepKey } from "@/lib/onboarding/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const T = (s: string) => supabase.from(s as any);

export type StepStatus = "not_started" | "in_progress" | "completed";

export interface StepState {
  status: StepStatus;
  updated_at?: string;
  note?: string;
}

export type StepStateMap = Partial<Record<OnboardingStepKey, StepState>>;

export interface ResumeSession extends OnboardingSession {
  step_state: StepStateMap;
}

/** The worker record tied to the signed-in user (worker portal). */
export function useMyWorkerRecord() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-worker-record", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workers")
        .select("id, agency_id, first_name, last_name")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Most recent (resumable) onboarding session for a worker. */
export function useResumableSession(workerId?: string) {
  return useQuery({
    queryKey: ["onboarding-resume", workerId],
    enabled: !!workerId,
    queryFn: async () => {
      const { data, error } = await T("onboarding_sessions")
        .select("*")
        .eq("worker_id", workerId!)
        .order("last_activity_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as any;
      return { ...row, step_state: (row.step_state ?? {}) as StepStateMap } as ResumeSession;
    },
  });
}

function computeProgress(state: StepStateMap) {
  const done = ONBOARDING_STEPS.filter((s) => state[s.key]?.status === "completed").length;
  return Math.round((done / ONBOARDING_STEPS.length) * 100);
}

/** Derived view model for the resume experience. */
export function useOnboardingProgress(session?: ResumeSession | null) {
  return useMemo(() => {
    const state = session?.step_state ?? {};
    const steps = ONBOARDING_STEPS.map((s, i) => ({
      ...s,
      index: i,
      status: (state[s.key]?.status ?? "not_started") as StepStatus,
      updatedAt: state[s.key]?.updated_at ?? null,
    }));
    const completed = steps.filter((s) => s.status === "completed").length;
    const nextStep =
      steps.find((s) => s.key === session?.current_step && s.status !== "completed") ??
      steps.find((s) => s.status === "in_progress") ??
      steps.find((s) => s.status !== "completed") ??
      null;
    return {
      steps,
      completed,
      total: steps.length,
      progressPct: computeProgress(state),
      nextStep,
      isComplete: completed === steps.length,
      lastActivityAt: session?.last_activity_at ?? null,
    };
  }, [session]);
}

/** Creates the worker's session on first visit so progress can be saved. */
export function useEnsureSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { worker_id: string; agency_id: string }) => {
      const { data, error } = await T("onboarding_sessions")
        .insert({
          worker_id: input.worker_id,
          agency_id: input.agency_id,
          status: "in_progress",
          current_step: ONBOARDING_STEPS[0].key,
          progress_pct: 0,
          step_state: {},
          device_info: { ua: navigator.userAgent, width: window.innerWidth },
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ResumeSession;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["onboarding-resume"] }),
  });
}

/** Saves step-level completion + resume position. */
export function useSaveStepProgress(session?: ResumeSession | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { step: OnboardingStepKey; status: StepStatus; setCurrent?: boolean }) => {
      if (!session) throw new Error("No onboarding session");
      const nextState: StepStateMap = {
        ...session.step_state,
        [input.step]: { status: input.status, updated_at: new Date().toISOString() },
      };
      const pct = computeProgress(nextState);
      const allDone = pct === 100;
      const patch: Record<string, unknown> = {
        step_state: nextState,
        progress_pct: pct,
        last_activity_at: new Date().toISOString(),
        status: allDone ? "completed" : "in_progress",
        completed_at: allDone ? new Date().toISOString() : null,
      };
      if (input.setCurrent !== false) patch.current_step = input.step;

      const { data, error } = await T("onboarding_sessions")
        .update(patch as any)
        .eq("id", session.id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ResumeSession;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding-resume"] });
      qc.invalidateQueries({ queryKey: ["onboarding-sessions"] });
    },
  });
}

/** Updates only the resume pointer (where the worker left off). */
export function useSetCurrentStep(session?: ResumeSession | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (step: OnboardingStepKey) => {
      if (!session) throw new Error("No onboarding session");
      const nextState: StepStateMap = session.step_state[step]?.status
        ? session.step_state
        : { ...session.step_state, [step]: { status: "in_progress", updated_at: new Date().toISOString() } };
      const { error } = await T("onboarding_sessions")
        .update({
          current_step: step,
          step_state: nextState,
          last_activity_at: new Date().toISOString(),
        } as any)
        .eq("id", session.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["onboarding-resume"] }),
  });
}
