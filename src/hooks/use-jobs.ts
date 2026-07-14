import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type JobOrderStatus = "draft" | "open" | "on_hold" | "filled" | "cancelled" | "closed";

export interface JobOrder {
  id: string;
  agency_id: string;
  client_id: string | null;
  site_id: string | null;
  title: string;
  description: string | null;
  status: JobOrderStatus;
  positions_needed: number;
  positions_filled: number;
  pay_rate: number | null;
  bill_rate: number | null;
  starts_on: string | null;
  ends_on: string | null;
  location: string | null;
  industry: string | null;
  created_at: string;
  updated_at: string;
}

export function useJobOrders() {
  const { agencyId } = useAuth();
  return useQuery({
    queryKey: ["job-orders", agencyId],
    enabled: !!agencyId,
    queryFn: async (): Promise<JobOrder[]> => {
      const { data, error } = await supabase
        .from("job_orders")
        .select("*")
        .eq("agency_id", agencyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as JobOrder[];
    },
  });
}

export function useJobOrder(id: string | undefined) {
  return useQuery({
    queryKey: ["job-order", id],
    enabled: !!id,
    queryFn: async (): Promise<JobOrder | null> => {
      const { data, error } = await supabase.from("job_orders").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data as JobOrder | null;
    },
  });
}

export function useCreateJobOrder() {
  const qc = useQueryClient();
  const { agencyId, user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<JobOrder> & { title: string }) => {
      if (!agencyId) throw new Error("Missing agency");
      const { data, error } = await supabase
        .from("job_orders")
        .insert({
          agency_id: agencyId,
          title: input.title,
          description: input.description ?? null,
          status: input.status ?? "open",
          positions_needed: input.positions_needed ?? 1,
          pay_rate: input.pay_rate ?? null,
          bill_rate: input.bill_rate ?? null,
          starts_on: input.starts_on ?? null,
          ends_on: input.ends_on ?? null,
          location: input.location ?? null,
          industry: input.industry ?? null,
          client_id: input.client_id ?? null,
          site_id: input.site_id ?? null,
          created_by: user?.id ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as JobOrder;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["job-orders"] }),
  });
}

export function useApplications(jobOrderId: string | undefined) {
  return useQuery({
    queryKey: ["applications", jobOrderId],
    enabled: !!jobOrderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*, worker:workers(id, first_name, last_name)")
        .eq("job_order_id", jobOrderId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRecordDecision() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      application_id: string;
      decision: string;
      reason_code?: string;
      notes?: string;
      ai_viewed?: boolean;
      ai_followed?: boolean;
      ai_rationale?: string;
    }) => {
      if (!user) throw new Error("Not signed in");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {
        application_id: input.application_id,
        decision: input.decision,
        reason_code: input.reason_code ?? null,
        notes: input.notes ?? null,
        ai_viewed: input.ai_viewed ?? false,
        ai_followed: input.ai_followed ?? false,
        ai_rationale: input.ai_rationale ?? null,
        decided_by: user.id,
      };
      const { error } = await supabase.from("candidate_decisions").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["applications"] }),
  });
}
