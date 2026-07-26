import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

// ---------- Payroll ----------
export function usePayrollRuns(agencyId?: string) {
  return useQuery({
    queryKey: ["pb-payroll-runs", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("pb_payroll_runs" as Any).select("*")
        .eq("agency_id", agencyId!).order("period_end", { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as Array<Record<string, unknown>>;
    },
  });
}
export function usePayrollRun(id?: string) {
  return useQuery({
    queryKey: ["pb-payroll-run", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("pb_payroll_runs" as Any).select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data as Record<string, unknown> | null;
    },
  });
}
export function usePayrollItems(runId?: string) {
  return useQuery({
    queryKey: ["pb-payroll-items", runId],
    enabled: !!runId,
    queryFn: async () => {
      const { data, error } = await supabase.from("pb_payroll_items" as Any).select("*").eq("run_id", runId!);
      if (error) throw error;
      return (data ?? []) as Array<Record<string, unknown>>;
    },
  });
}
export function usePayrollExceptions(runId?: string) {
  return useQuery({
    queryKey: ["pb-payroll-exceptions", runId],
    enabled: !!runId,
    queryFn: async () => {
      const { data, error } = await supabase.from("pb_payroll_exceptions" as Any).select("*").eq("run_id", runId!);
      if (error) throw error;
      return (data ?? []) as Array<Record<string, unknown>>;
    },
  });
}
export function useGeneratePayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { agency_id: string; period_start: string; period_end: string; source_batch_id?: string }) => {
      const { data, error } = await supabase.functions.invoke("pb-generate-payroll", { body: input });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pb-payroll-runs"] }); },
  });
}
export function useApprovePayrollRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pb_payroll_runs" as Any).update({
        status: "approved", approved_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["pb-payroll-runs"] });
      qc.invalidateQueries({ queryKey: ["pb-payroll-run", id] });
    },
  });
}
export function useMarkPayrollPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pb_payroll_runs" as Any).update({
        status: "paid", paid_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pb-payroll-runs"] }),
  });
}
export function useComplianceScanRun() {
  return useMutation({
    mutationFn: async (run_id: string) => {
      const { data, error } = await supabase.functions.invoke("pb-compliance-scan", { body: { run_id } });
      if (error) throw error;
      return data;
    },
  });
}

// ---------- Invoices ----------
export function useInvoices(agencyId?: string, status?: string) {
  return useQuery({
    queryKey: ["pb-invoices", agencyId, status],
    enabled: !!agencyId,
    queryFn: async () => {
      let q = supabase.from("pb_invoices" as Any).select("*")
        .eq("agency_id", agencyId!).order("period_end", { ascending: false }).limit(200);
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Array<Record<string, unknown>>;
    },
  });
}
export function useInvoice(id?: string) {
  return useQuery({
    queryKey: ["pb-invoice", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("pb_invoices" as Any).select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data as Record<string, unknown> | null;
    },
  });
}
export function useInvoiceItems(invoiceId?: string) {
  return useQuery({
    queryKey: ["pb-invoice-items", invoiceId],
    enabled: !!invoiceId,
    queryFn: async () => {
      const { data, error } = await supabase.from("pb_invoice_items" as Any).select("*").eq("invoice_id", invoiceId!);
      if (error) throw error;
      return (data ?? []) as Array<Record<string, unknown>>;
    },
  });
}
export function useGenerateInvoices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { agency_id: string; period_start: string; period_end: string; source_batch_id?: string }) => {
      const { data, error } = await supabase.functions.invoke("pb-generate-invoices", { body: input });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pb-invoices"] }),
  });
}
export function useUpdateInvoiceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const patch: Record<string, unknown> = { status };
      if (status === "sent") patch.sent_at = new Date().toISOString();
      const { error } = await supabase.from("pb_invoices" as Any).update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pb-invoices"] }),
  });
}
export function useInvoicePayments(invoiceId?: string) {
  return useQuery({
    queryKey: ["pb-invoice-payments", invoiceId],
    enabled: !!invoiceId,
    queryFn: async () => {
      const { data, error } = await supabase.from("pb_invoice_payments" as Any).select("*").eq("invoice_id", invoiceId!);
      if (error) throw error;
      return (data ?? []) as Array<Record<string, unknown>>;
    },
  });
}
export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { invoice_id: string; amount: number; method: string; reference?: string }) => {
      const { data, error } = await supabase.functions.invoke("pb-record-payment", { body: input });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pb-invoices"] });
      qc.invalidateQueries({ queryKey: ["pb-invoice-payments"] });
    },
  });
}

// ---------- Rates ----------
export function usePayRates(agencyId?: string) {
  return useQuery({
    queryKey: ["pb-pay-rates", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("pb_worker_pay_rates" as Any).select("*").eq("agency_id", agencyId!);
      if (error) throw error;
      return (data ?? []) as Array<Record<string, unknown>>;
    },
  });
}
export function useBillRates(agencyId?: string) {
  return useQuery({
    queryKey: ["pb-bill-rates", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("pb_client_bill_rates" as Any).select("*").eq("agency_id", agencyId!);
      if (error) throw error;
      return (data ?? []) as Array<Record<string, unknown>>;
    },
  });
}
export function useUpsertPayRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      const { error } = await supabase.from("pb_worker_pay_rates" as Any).insert(row);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pb-pay-rates"] }),
  });
}
export function useUpsertBillRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      const { error } = await supabase.from("pb_client_bill_rates" as Any).insert(row);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pb-bill-rates"] }),
  });
}

// ---------- Commissions ----------
export function useCommissionRules(agencyId?: string) {
  return useQuery({
    queryKey: ["pb-commission-rules", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("pb_commission_rules" as Any).select("*").eq("agency_id", agencyId!);
      if (error) throw error;
      return (data ?? []) as Array<Record<string, unknown>>;
    },
  });
}
export function useCommissionRecords(agencyId?: string) {
  return useQuery({
    queryKey: ["pb-commission-records", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("pb_commission_records" as Any).select("*")
        .eq("agency_id", agencyId!).order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []) as Array<Record<string, unknown>>;
    },
  });
}
export function useComputeCommissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { agency_id: string; invoice_ids?: string[] }) => {
      const { data, error } = await supabase.functions.invoke("pb-compute-commissions", { body: input });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pb-commission-records"] }),
  });
}

// ---------- Forecast / Margin ----------
export function useForecasts(agencyId?: string) {
  return useQuery({
    queryKey: ["pb-forecasts", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("pb_financial_forecasts" as Any).select("*")
        .eq("agency_id", agencyId!).order("generated_at", { ascending: false }).limit(50);
      if (error) throw error;
      return (data ?? []) as Array<Record<string, unknown>>;
    },
  });
}
export function useMarginAnalysis(agencyId?: string) {
  return useQuery({
    queryKey: ["pb-margin", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("pb_margin_analysis" as Any).select("*")
        .eq("agency_id", agencyId!).order("period_end", { ascending: false }).limit(50);
      if (error) throw error;
      return (data ?? []) as Array<Record<string, unknown>>;
    },
  });
}
export function useRunForecast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (agency_id: string) => {
      const { data, error } = await supabase.functions.invoke("pb-forecast", { body: { agency_id } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pb-forecasts"] });
      qc.invalidateQueries({ queryKey: ["pb-margin"] });
    },
  });
}
