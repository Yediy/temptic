import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

// ─── Clients ───
export function useClients() {
  const { agencyId } = useAuth();
  return useQuery({
    queryKey: ["clients", agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("company_name");
      if (error) throw error;
      return data as Tables<"clients">[];
    },
    enabled: !!agencyId,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  const { agencyId } = useAuth();
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<"clients">, "agency_id">) => {
      const { data, error } = await supabase
        .from("clients")
        .insert({ ...input, agency_id: agencyId! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

// ─── Client Sites ───
export function useClientSites(clientId?: string) {
  return useQuery({
    queryKey: ["client_sites", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_sites")
        .select("*")
        .eq("client_id", clientId!)
        .order("site_name");
      if (error) throw error;
      return data as Tables<"client_sites">[];
    },
    enabled: !!clientId,
  });
}

export function useCreateClientSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"client_sites">) => {
      const { data, error } = await supabase
        .from("client_sites")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["client_sites", vars.client_id] }),
  });
}

// ─── Workers ───
export function useWorkers() {
  const { agencyId } = useAuth();
  return useQuery({
    queryKey: ["workers", agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workers")
        .select("*")
        .order("last_name");
      if (error) throw error;
      return data as Tables<"workers">[];
    },
    enabled: !!agencyId,
  });
}

export function useCreateWorker() {
  const qc = useQueryClient();
  const { agencyId } = useAuth();
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<"workers">, "agency_id">) => {
      const { data, error } = await supabase
        .from("workers")
        .insert({ ...input, agency_id: agencyId! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workers"] }),
  });
}

// ─── Tickets ───
export function useTickets() {
  const { agencyId } = useAuth();
  return useQuery({
    queryKey: ["tickets", agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Tables<"tickets">[];
    },
    enabled: !!agencyId,
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"tickets">) => {
      const { data, error } = await supabase
        .from("tickets")
        .insert(input)
        .select()
        .single();
      if (error) throw error;

      // Generate draft PDF
      await supabase.functions.invoke("generate-pdf", {
        body: { ticket_id: data.id, pdf_type: "draft" },
      });

      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tickets"] }),
  });
}

// ─── Ticket Number ───
export async function generateTicketNumber(agencyId?: string | null): Promise<string> {
  if (agencyId) {
    // Use the server-side atomic function to avoid race conditions
    const { data, error } = await supabase.rpc("next_ticket_number", { _agency_id: agencyId });
    if (!error && data) return data;
  }
  // Fallback: client-side generation (shouldn't happen with valid agencyId)
  const year = new Date().getFullYear();
  const prefix = `TT-${year}-`;
  const { data } = await supabase
    .from("tickets")
    .select("ticket_number")
    .like("ticket_number", `${prefix}%`)
    .order("ticket_number", { ascending: false })
    .limit(1);
  let seq = 1;
  if (data && data.length > 0) {
    const num = parseInt(data[0].ticket_number.replace(prefix, ""), 10);
    if (!isNaN(num)) seq = num + 1;
  }
  return `${prefix}${String(seq).padStart(6, "0")}`;
}

// ─── Dashboard Stats ───
export function useDashboardStats() {
  const { agencyId } = useAuth();
  return useQuery({
    queryKey: ["dashboard-stats", agencyId],
    queryFn: async () => {
      const { data: tickets, error } = await supabase
        .from("tickets")
        .select("status, total_hours");
      if (error) throw error;

      const all = tickets ?? [];
      return {
        drafts: all.filter(t => t.status === "draft").length,
        sent: all.filter(t => t.status === "sent").length,
        unsigned: all.filter(t => ["sent", "viewed"].includes(t.status)).length,
        signed: all.filter(t => t.status === "signed").length,
        rejected: all.filter(t => t.status === "rejected").length,
        totalHours: all.reduce((s, t) => s + (Number(t.total_hours) || 0), 0),
        total: all.length,
      };
    },
    enabled: !!agencyId,
  });
}
