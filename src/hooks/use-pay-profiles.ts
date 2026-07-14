import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export function usePayProfiles() {
  const { agencyId } = useAuth();
  return useQuery({
    queryKey: ["pay-profiles", agencyId],
    enabled: !!agencyId,
    queryFn: async (): Promise<Any[]> => {
      const { data, error } = await supabase
        .from("pay_profiles" as Any)
        .select("*")
        .eq("agency_id", agencyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBillProfiles() {
  const { agencyId } = useAuth();
  return useQuery({
    queryKey: ["bill-profiles", agencyId],
    enabled: !!agencyId,
    queryFn: async (): Promise<Any[]> => {
      const { data, error } = await supabase
        .from("bill_profiles" as Any)
        .select("*")
        .eq("agency_id", agencyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreatePayProfile() {
  const qc = useQueryClient();
  const { agencyId } = useAuth();
  return useMutation({
    mutationFn: async (input: { name: string; base_rate?: number; ot_multiplier?: number; burden_percent?: number }) => {
      if (!agencyId) throw new Error("Missing agency");
      const { data, error } = await supabase.from("pay_profiles" as Any).insert({ agency_id: agencyId, ...input }).select("*").single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pay-profiles"] }),
  });
}

export function useCreateBillProfile() {
  const qc = useQueryClient();
  const { agencyId } = useAuth();
  return useMutation({
    mutationFn: async (input: { name: string; markup_percent?: number; flat_bill_rate?: number }) => {
      if (!agencyId) throw new Error("Missing agency");
      const { data, error } = await supabase.from("bill_profiles" as Any).insert({ agency_id: agencyId, ...input }).select("*").single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bill-profiles"] }),
  });
}
