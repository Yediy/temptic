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
        .eq("agency_id", agencyId!)
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
      if (!agencyId) throw new Error("No agency context");
      if (!input.company_name?.trim()) throw new Error("Company name is required");
      const { data, error } = await supabase
        .from("clients")
        .insert({ ...input, agency_id: agencyId })
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
      if (!input.address_line1?.trim()) throw new Error("Address is required");
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

// ─── Client Signers ───
export function useClientSigners(clientId?: string) {
  return useQuery({
    queryKey: ["client_signers", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_signers")
        .select("*")
        .eq("client_id", clientId!)
        .order("last_name");
      if (error) throw error;
      return data as Tables<"client_signers">[];
    },
    enabled: !!clientId,
  });
}

export function useCreateClientSigner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<"client_signers">, "initials"> & { client_id: string }) => {
      if (!input.first_name?.trim() || !input.last_name?.trim()) throw new Error("First and last name are required");
      if (!input.email?.trim()) throw new Error("Email is required for portal invitations");
      const initials = `${(input.first_name || "")[0] || ""}${(input.last_name || "")[0] || ""}`.toUpperCase();
      const { data, error } = await supabase
        .from("client_signers")
        .insert({ ...input, initials })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["client_signers", vars.client_id] }),
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
        .eq("agency_id", agencyId!)
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
      if (!agencyId) throw new Error("No agency context");
      if (!input.first_name?.trim() || !input.last_name?.trim()) throw new Error("First and last name are required");
      const { data, error } = await supabase
        .from("workers")
        .insert({ ...input, agency_id: agencyId })
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
        .eq("agency_id", agencyId!)
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

      // Generate draft PDF — non-blocking, log failures silently
      try {
        await supabase.functions.invoke("generate-pdf", {
          body: { ticket_id: data.id, pdf_type: "draft" },
        });
      } catch {
        // PDF generation failure should not block ticket creation
        console.warn("Draft PDF generation failed — PDF pipeline may not be configured");
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

// ─── Ticket Number ───
export async function generateTicketNumber(agencyId?: string | null): Promise<string> {
  if (agencyId) {
    const { data, error } = await supabase.rpc("next_ticket_number", { _agency_id: agencyId });
    if (!error && data) return data;
  }
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

// ─── Dashboard Analytics ───
export type DashboardAnalytics = {
  avgApprovalHours: number | null;
  avgSignatureDelayHours: number | null;
  fastestClient: { name: string; avgHours: number } | null;
  slowestClient: { name: string; avgHours: number } | null;
  ticketsToday: number;
  weeklyHours: number;
  workerUtilization: Array<{ name: string; hours: number }>;
  rejectedPctMonth: number | null;
  topClientMonth: { name: string; count: number } | null;
  topWorkerMonth: { name: string; hours: number } | null;
  hasRateData: boolean;
  monthlyRevenueEstimate: number | null;
};

export function useDashboardAnalytics() {
  const { agencyId } = useAuth();
  return useQuery({
    queryKey: ["dashboard-analytics", agencyId],
    queryFn: async (): Promise<DashboardAnalytics> => {
      const now = new Date();
      const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      // Week: start Monday
      const weekStart = new Date(now);
      const dow = (weekStart.getDay() + 6) % 7; // 0 = Monday
      weekStart.setDate(weekStart.getDate() - dow);
      weekStart.setHours(0, 0, 0, 0);

      const dayStartIso = dayStart.toISOString();
      const monthStartIso = monthStart.toISOString();
      const weekStartIso = weekStart.toISOString();

      const { data, error } = await supabase
        .from("tickets")
        .select("id, status, total_hours, created_at, sent_at, signed_at, rejected_at, client_id, client_company_name_snapshot, worker_id, worker_name_snapshot");
      if (error) throw error;
      const tickets = data ?? [];

      const HOUR = 1000 * 60 * 60;
      const signed = tickets.filter(t => t.sent_at && t.signed_at);
      const delays = signed.map(t => (new Date(t.signed_at!).getTime() - new Date(t.sent_at!).getTime()) / HOUR);
      const avg = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
      const avgApprovalHours = avg(delays);

      // Per-client avg approval
      const byClient = new Map<string, { name: string; hours: number[]; count: number }>();
      for (const t of signed) {
        const key = t.client_id || t.client_company_name_snapshot || "unknown";
        const entry = byClient.get(key) ?? { name: t.client_company_name_snapshot || "Unknown", hours: [], count: 0 };
        entry.hours.push((new Date(t.signed_at!).getTime() - new Date(t.sent_at!).getTime()) / HOUR);
        byClient.set(key, entry);
      }
      const clientAverages = Array.from(byClient.values())
        .filter(c => c.hours.length > 0)
        .map(c => ({ name: c.name, avgHours: c.hours.reduce((a, b) => a + b, 0) / c.hours.length }));
      const fastestClient = clientAverages.length ? clientAverages.reduce((a, b) => a.avgHours < b.avgHours ? a : b) : null;
      const slowestClient = clientAverages.length ? clientAverages.reduce((a, b) => a.avgHours > b.avgHours ? a : b) : null;

      const ticketsToday = tickets.filter(t => t.created_at && t.created_at >= dayStartIso).length;
      const weeklyHours = tickets
        .filter(t => t.created_at && t.created_at >= weekStartIso)
        .reduce((s, t) => s + (Number(t.total_hours) || 0), 0);

      // Worker utilization (this month)
      const workerMap = new Map<string, { name: string; hours: number }>();
      for (const t of tickets) {
        if (!t.created_at || t.created_at < monthStartIso) continue;
        const key = t.worker_id || t.worker_name_snapshot || "unknown";
        const entry = workerMap.get(key) ?? { name: t.worker_name_snapshot || "Unknown", hours: 0 };
        entry.hours += Number(t.total_hours) || 0;
        workerMap.set(key, entry);
      }
      const workerUtilization = Array.from(workerMap.values())
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 5);
      const topWorkerMonth = workerUtilization[0] ?? null;

      // Month totals
      const monthTickets = tickets.filter(t => t.created_at && t.created_at >= monthStartIso);
      const monthRejected = monthTickets.filter(t => t.status === "rejected").length;
      const rejectedPctMonth = monthTickets.length ? (monthRejected / monthTickets.length) * 100 : null;

      // Top client (most tickets this month)
      const clientCountMap = new Map<string, { name: string; count: number }>();
      for (const t of monthTickets) {
        const key = t.client_id || t.client_company_name_snapshot || "unknown";
        const entry = clientCountMap.get(key) ?? { name: t.client_company_name_snapshot || "Unknown", count: 0 };
        entry.count += 1;
        clientCountMap.set(key, entry);
      }
      const topClientMonth = clientCountMap.size
        ? Array.from(clientCountMap.values()).reduce((a, b) => a.count > b.count ? a : b)
        : null;

      return {
        avgApprovalHours,
        avgSignatureDelayHours: avgApprovalHours, // same metric, labeled differently
        fastestClient,
        slowestClient,
        ticketsToday,
        weeklyHours,
        workerUtilization,
        rejectedPctMonth,
        topClientMonth,
        topWorkerMonth,
        hasRateData: false,
        monthlyRevenueEstimate: null,
      };
    },
    enabled: !!agencyId,
  });
}

// ─── Dashboard Stats ───
export function useDashboardStats() {
  const { agencyId } = useAuth();
  return useQuery({
    queryKey: ["dashboard-stats", agencyId],
    queryFn: async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthStartIso = monthStart.toISOString();

      const [ticketsRes, workersRes, clientsRes] = await Promise.all([
        supabase
          .from("tickets")
          .select("status, total_hours, created_at, signed_at, rejected_at"),
        supabase.from("workers").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);

      if (ticketsRes.error) throw ticketsRes.error;

      const all = ticketsRes.data ?? [];
      const inMonth = (iso: string | null) => !!iso && iso >= monthStartIso;

      return {
        drafts: all.filter(t => t.status === "draft").length,
        sent: all.filter(t => t.status === "sent").length,
        unsigned: all.filter(t => ["sent", "viewed"].includes(t.status)).length,
        signed: all.filter(t => t.status === "signed").length,
        rejected: all.filter(t => t.status === "rejected").length,
        totalHours: all.reduce((s, t) => s + (Number(t.total_hours) || 0), 0),
        total: all.length,
        // This month
        createdThisMonth: all.filter(t => inMonth(t.created_at)).length,
        signedThisMonth: all.filter(t => inMonth(t.signed_at)).length,
        rejectedThisMonth: all.filter(t => inMonth(t.rejected_at)).length,
        pendingApprovals: all.filter(t => ["sent", "viewed"].includes(t.status)).length,
        activeWorkers: workersRes.count ?? 0,
        activeClients: clientsRes.count ?? 0,
      };
    },
    enabled: !!agencyId,
  });
}
