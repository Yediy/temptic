import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PassportReputation } from "@/lib/passport/types";

export type ReputationCategory =
  | "attendance"
  | "reliability"
  | "performance"
  | "safety"
  | "professionalism"
  | "client_feedback"
  | "completion";

export const REPUTATION_CATEGORIES: {
  key: ReputationCategory;
  label: string;
  weight: number;
  description: string;
}[] = [
  { key: "attendance", label: "Attendance", weight: 0.2, description: "Shifts worked vs no-shows and on-time arrivals." },
  { key: "reliability", label: "Reliability", weight: 0.2, description: "Assignments and shifts finished as committed." },
  { key: "performance", label: "Performance", weight: 0.15, description: "Time ticket approval rate, anomalies and corrections." },
  { key: "safety", label: "Safety", weight: 0.15, description: "Current safety compliance items and valid credentials." },
  { key: "professionalism", label: "Professionalism", weight: 0.1, description: "Rejection and correction-free ticket history." },
  { key: "client_feedback", label: "Client Feedback", weight: 0.1, description: "Client sign-off approval rate on labor tickets." },
  { key: "completion", label: "Completion", weight: 0.1, description: "Onboarding, training and profile completeness." },
];

export function useReputation(passportId?: string) {
  return useQuery({
    queryKey: ["passport-reputation", passportId],
    enabled: !!passportId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("passport_reputation").select("*").eq("passport_id", passportId!);
      if (error) throw error;
      return data as PassportReputation[];
    },
  });
}

export function useRecomputeReputation(passportId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("passport-reputation", {
        body: { passport_id: passportId },
      });
      if (error) throw error;
      return data as { overall_score: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["passport-reputation", passportId] });
      qc.invalidateQueries({ queryKey: ["passport", passportId] });
      qc.invalidateQueries({ queryKey: ["passport-bundle", passportId] });
      qc.invalidateQueries({ queryKey: ["passport-timeline-aggregate", passportId] });
    },
  });
}

/** Workers may only flag a dispute — score fields are service-role only. */
export function useDisputeReputation(passportId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, disputed, reason }: { id: string; disputed: boolean; reason?: string }) => {
      const { error } = await supabase
        .from("passport_reputation")
        .update({ disputed, dispute_reason: disputed ? (reason ?? null) : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["passport-reputation", passportId] }),
  });
}
