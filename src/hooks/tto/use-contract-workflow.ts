import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { contractSchema } from "@/lib/tto/contract-validation";
import type { Tables } from "@/integrations/supabase/types";

export type Contract = Tables<"tto_contracts">;
export type Assignment = Tables<"assignments">;
export type TicketTerms = Tables<"tto_ticket_terms">;

export function useContractCatalog() {
  const { agencyId } = useAuth();
  return useQuery({ queryKey: ["contract-catalog", agencyId], enabled: !!agencyId, queryFn: async () => {
    if (!agencyId) throw new Error("Select an agency");
    const [clients, workers] = await Promise.all([
      supabase.from("clients").select("id,company_name").eq("agency_id", agencyId).order("company_name").limit(1000),
      supabase.from("workers").select("id,first_name,last_name").eq("agency_id", agencyId).order("last_name").limit(1000),
    ]);
    if (clients.error) throw clients.error; if (workers.error) throw workers.error;
    const ids = clients.data.map(c => c.id);
    const [sites, supervisors] = ids.length ? await Promise.all([
      supabase.from("client_sites").select("id,client_id,site_name,address_line1").in("client_id", ids).eq("is_active", true).limit(1000),
      supabase.from("client_signers").select("id,client_id,site_id,first_name,last_name,email,user_id").in("client_id", ids).eq("is_active", true).limit(1000),
    ]) : [{ data: [], error: null }, { data: [], error: null }];
    if (sites.error) throw sites.error; if (supervisors.error) throw supervisors.error;
    return { clients: clients.data, workers: workers.data, sites: sites.data ?? [], supervisors: supervisors.data ?? [] };
  }});
}

export function useContracts() {
  const { agencyId } = useAuth();
  return useQuery({ queryKey: ["tto-contracts", agencyId], enabled: !!agencyId, queryFn: async () => {
    if (!agencyId) return [];
    const { data, error } = await supabase.from("tto_contracts").select("*").eq("agency_id", agencyId).order("created_at", { ascending: false }).limit(1000);
    if (error) throw error; return data;
  }});
}

export function useContractAssignments() {
  const { agencyId } = useAuth();
  return useQuery({ queryKey: ["tto-assignments", agencyId], enabled: !!agencyId, queryFn: async () => {
    if (!agencyId) return [];
    const { data, error } = await supabase.from("assignments").select("*").eq("agency_id", agencyId).not("contract_id", "is", null).order("created_at", { ascending: false }).limit(1000);
    if (error) throw error; return data;
  }});
}

export function useContractTickets() {
  const { agencyId } = useAuth();
  return useQuery({ queryKey: ["tto-contracted-tickets", agencyId], enabled: !!agencyId, refetchInterval: 15000, queryFn: async () => {
    if (!agencyId) return { tickets: [], terms: [] };
    const [tickets, terms] = await Promise.all([
      supabase.from("tto_time_tickets").select("*").eq("agency_id", agencyId).order("work_date", { ascending: false }).limit(1000),
      supabase.from("tto_ticket_terms").select("*").eq("agency_id", agencyId).order("captured_at", { ascending: false }).limit(1000),
    ]);
    if (tickets.error) throw tickets.error; if (terms.error) throw terms.error;
    return { tickets: tickets.data, terms: terms.data };
  }});
}

export function useCreateContract() {
  const { agencyId } = useAuth(); const qc = useQueryClient();
  return useMutation({ mutationFn: async (input: unknown) => {
    if (!agencyId) throw new Error("Select an agency");
    const v = contractSchema.parse(input);
    const { data, error } = await supabase.rpc("create_tto_contract", { _agency_id: agencyId, _reference: v.reference, _client_id: v.client_id, _site_id: v.site_id, _supervisor_id: v.supervisor_id, _work_details: v.work_details, _pay_rate: v.pay_rate, _bill_rate: v.bill_rate, _currency: v.currency, _starts_on: v.starts_on, _ends_on: v.ends_on });
    if (error) throw new Error(error.message); return data;
  }, onSuccess: () => qc.invalidateQueries({ queryKey: ["tto-contracts"] }) });
}

export function useCreateContractAssignment() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (v: { contract_id: string; worker_id: string; starts_on: string; ends_on: string | null }) => {
    const { data, error } = await supabase.rpc("create_tto_assignment", { _contract_id: v.contract_id, _worker_id: v.worker_id, _starts_on: v.starts_on, _ends_on: v.ends_on });
    if (error) throw new Error(error.message); return data;
  }, onSuccess: () => qc.invalidateQueries({ queryKey: ["tto-assignments"] }) });
}

export function useCreateContractTicket() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (v: { assignment_id: string; work_date: string; actual_start: string | null; actual_end: string | null }) => {
    const { data, error } = await supabase.rpc("create_contracted_time_ticket", { _assignment_id: v.assignment_id, _work_date: v.work_date, _actual_start: v.actual_start, _actual_end: v.actual_end });
    if (error) throw new Error(error.message); return data;
  }, onSuccess: () => { void qc.invalidateQueries({ queryKey: ["tto-contracted-tickets"] }); void qc.invalidateQueries({ queryKey: ["tto-tickets"] }); } });
}