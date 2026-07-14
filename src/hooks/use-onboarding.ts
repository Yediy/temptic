import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type OnboardingChecklist = Tables<"onboarding_checklists">;
export type OnboardingItem = Tables<"onboarding_items">;
export type OnboardingTemplate = Tables<"onboarding_templates">;
export type OnboardingStage = OnboardingChecklist["stage"];

export const STAGES: { key: OnboardingStage; label: string }[] = [
  { key: "sourced", label: "Sourced" },
  { key: "applied", label: "Applied" },
  { key: "screening", label: "Screening" },
  { key: "interviewing", label: "Interviewing" },
  { key: "offered", label: "Offered" },
  { key: "documents", label: "Documents" },
  { key: "training", label: "Training" },
  { key: "compliance", label: "Compliance" },
  { key: "ready", label: "Ready" },
  { key: "placed", label: "Placed" },
  { key: "on_hold", label: "On hold" },
  { key: "rejected", label: "Rejected" },
];

export function useOnboardingBoard(agencyId?: string) {
  return useQuery({
    queryKey: ["onboarding-board", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_checklists")
        .select("*, worker:workers(id, first_name, last_name, email)")
        .eq("agency_id", agencyId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useChecklist(workerId?: string) {
  return useQuery({
    queryKey: ["onboarding-checklist", workerId],
    enabled: !!workerId,
    queryFn: async () => {
      const { data: checklist } = await supabase
        .from("onboarding_checklists")
        .select("*")
        .eq("worker_id", workerId!)
        .maybeSingle();
      if (!checklist) return { checklist: null, items: [] as OnboardingItem[] };
      const { data: items, error } = await supabase
        .from("onboarding_items")
        .select("*")
        .eq("checklist_id", checklist.id)
        .order("sort_order");
      if (error) throw error;
      return { checklist, items: items ?? [] };
    },
  });
}

export function useUpdateStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: OnboardingStage }) => {
      const { error } = await supabase
        .from("onboarding_checklists")
        .update({ stage, cleared_at: stage === "ready" || stage === "placed" ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["onboarding-board"] }),
  });
}

export function useToggleItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from("onboarding_items")
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["onboarding-checklist"] }),
  });
}
