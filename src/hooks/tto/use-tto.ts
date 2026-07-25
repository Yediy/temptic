import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export type TtoTicket = {
  id: string;
  agency_id: string;
  worker_id: string;
  client_id: string | null;
  site_id: string | null;
  work_date: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  status: string;
  regular_hours: number;
  overtime_hours: number;
  double_time_hours: number;
  anomalies: string[];
  worker_notes: string | null;
  supervisor_notes: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
};

export function useTtoTickets(filter: { status?: string | string[]; workerId?: string; clientId?: string; agencyId?: string } = {}) {
  return useQuery({
    queryKey: ["tto-tickets", filter],
    queryFn: async () => {
      let q = supabase.from("tto_time_tickets" as Any).select("*").order("work_date", { ascending: false }).limit(200);
      if (filter.workerId) q = q.eq("worker_id", filter.workerId);
      if (filter.clientId) q = q.eq("client_id", filter.clientId);
      if (filter.agencyId) q = q.eq("agency_id", filter.agencyId);
      if (filter.status) q = Array.isArray(filter.status) ? q.in("status", filter.status) : q.eq("status", filter.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as TtoTicket[];
    },
  });
}

export function useTtoTicket(id: string | undefined) {
  return useQuery({
    queryKey: ["tto-ticket", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("tto_time_tickets" as Any).select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data as unknown as TtoTicket | null;
    },
  });
}

export function useTtoPunches(ticketId: string | undefined) {
  return useQuery({
    queryKey: ["tto-punches", ticketId],
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await supabase.from("tto_time_entries" as Any)
        .select("*").eq("time_ticket_id", ticketId!).order("occurred_at");
      if (error) throw error;
      return (data ?? []) as unknown as Array<Record<string, unknown>>;
    },
  });
}

export function useTtoPunch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { time_ticket_id: string; kind: "clock_in"|"clock_out"|"break_start"|"break_end"; source?: string; latitude?: number; longitude?: number; accuracy_m?: number; device_id?: string }) => {
      const { data, error } = await supabase.functions.invoke("tto-clock", { body: input });
      if (error) throw error; return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["tto-tickets"] });
      qc.invalidateQueries({ queryKey: ["tto-ticket", v.time_ticket_id] });
      qc.invalidateQueries({ queryKey: ["tto-punches", v.time_ticket_id] });
    },
  });
}

export function useTtoSubmit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { time_ticket_id: string; notes?: string }) => {
      const { data, error } = await supabase.functions.invoke("tto-submit-ticket", { body: input });
      if (error) throw error; return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tto-tickets"] }),
  });
}

export function useTtoDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { time_ticket_id: string; decision: "approve"|"reject"|"correction"; comment?: string; approver_kind?: string }) => {
      const { data, error } = await supabase.functions.invoke("tto-approve-ticket", { body: input });
      if (error) throw error; return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tto-tickets"] }),
  });
}

export function useTtoValidate() {
  return useMutation({
    mutationFn: async (input: { time_ticket_id?: string }) => {
      const { data, error } = await supabase.functions.invoke("tto-validate", { body: input });
      if (error) throw error; return data;
    },
  });
}

export function useTtoPreparePayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { agency_id: string; period_start: string; period_end: string; name?: string }) => {
      const { data, error } = await supabase.functions.invoke("tto-prepare-payroll", { body: input });
      if (error) throw error; return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tto-payroll-batches"] }),
  });
}

export function useTtoPrepareBilling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { agency_id: string; client_id?: string; period_start: string; period_end: string; name?: string }) => {
      const { data, error } = await supabase.functions.invoke("tto-prepare-billing", { body: input });
      if (error) throw error; return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tto-billing-batches"] }),
  });
}

export function useTtoPayrollBatches() {
  return useQuery({
    queryKey: ["tto-payroll-batches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tto_payroll_batches" as Any).select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error; return (data ?? []) as unknown as Array<Record<string, unknown>>;
    },
  });
}

export function useTtoBillingBatches() {
  return useQuery({
    queryKey: ["tto-billing-batches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tto_billing_batches" as Any).select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error; return (data ?? []) as unknown as Array<Record<string, unknown>>;
    },
  });
}

export function useTtoCorrections(status?: string) {
  return useQuery({
    queryKey: ["tto-corrections", status ?? "all"],
    queryFn: async () => {
      let q = supabase.from("tto_ticket_corrections" as Any).select("*").order("created_at", { ascending: false }).limit(200);
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error; return (data ?? []) as unknown as Array<Record<string, unknown>>;
    },
  });
}

export function useTtoSubmitCorrection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { agency_id: string; time_ticket_id: string; reason: string; proposed_changes?: Record<string, unknown>; evidence?: unknown[] }) => {
      const { data, error } = await supabase.from("tto_ticket_corrections" as Any).insert({
        agency_id: input.agency_id, time_ticket_id: input.time_ticket_id, reason: input.reason,
        proposed_changes: input.proposed_changes ?? {}, evidence: input.evidence ?? [],
        requested_by: (await supabase.auth.getUser()).data.user?.id,
      }).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tto-corrections"] }),
  });
}

export function useTtoAuditEvents(ticketId?: string) {
  return useQuery({
    queryKey: ["tto-audit", ticketId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("tto_audit_events" as Any).select("*").order("occurred_at", { ascending: false }).limit(200);
      if (ticketId) q = q.eq("time_ticket_id", ticketId);
      const { data, error } = await q;
      if (error) throw error; return (data ?? []) as unknown as Array<Record<string, unknown>>;
    },
  });
}

export function useTtoLiveLabor(agencyId: string | undefined) {
  return useQuery({
    queryKey: ["tto-live-labor", agencyId],
    enabled: !!agencyId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tto-live-labor?agency_id=${agencyId}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Live labor fetch failed: ${res.status}`);
      return await res.json() as { active_workers: number; total_hours_today: number; overtime_hours: number; late_arrivals: number; approval_queue: number };
    },
  });
}
