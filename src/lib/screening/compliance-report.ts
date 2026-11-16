import { supabase } from "@/integrations/supabase/client";

export const OPEN_COMPLIANCE_STATUSES = ["open", "pending", "warning", "expired"];
export const REPORT_PAGE_SIZE = 50;
export type ScreeningRow = { id: string; type: "order" | "report" | "consent"; worker: string; status: string; date: string | null; version: number | null; provider: string | null };

/** Do not expose fetched screening metadata until its read has been audited. */
export async function readComplianceScreening(agencyId: string, page: number): Promise<ScreeningRow[]> {
  const from = page * REPORT_PAGE_SIZE;
  const to = from + REPORT_PAGE_SIZE - 1;
  const [orders, reports, consents] = await Promise.all([
    supabase.from("screening_orders").select("id,worker_id,status,created_at,provider").eq("agency_id", agencyId).order("created_at", { ascending: false }).order("id").range(from, to),
    supabase.from("screening_reports").select("id,result,received_at,document_version,screening_orders!inner(worker_id,agency_id,provider)").eq("screening_orders.agency_id", agencyId).order("received_at", { ascending: false }).order("id").range(from, to),
    supabase.from("screening_consents").select("id,worker_id,signed_at,created_at,document_version,screening_orders!inner(agency_id,provider)").eq("screening_orders.agency_id", agencyId).order("created_at", { ascending: false }).order("id").range(from, to),
  ]);
  for (const result of [orders, reports, consents]) if (result.error) throw result.error;
  for (const [type, result] of [["order", orders], ["report", reports], ["consent", consents]] as const) {
    const ids = (result.data ?? []).map((r) => r.id);
    if (!ids.length) continue;
    const { error } = await supabase.rpc("log_screening_access", { _record_type: type, _record_ids: ids, _context: "compliance report" });
    if (error) throw new Error("Screening access could not be recorded. Records have not been displayed.");
  }
  return [
    ...(orders.data ?? []).map((r): ScreeningRow => ({ id: r.id, type: "order", worker: r.worker_id, status: r.status, date: r.created_at, version: null, provider: r.provider })),
    ...(reports.data ?? []).map((r): ScreeningRow => ({ id: r.id, type: "report", worker: r.screening_orders.worker_id, status: r.result ?? "pending", date: r.received_at, version: r.document_version, provider: r.screening_orders.provider })),
    ...(consents.data ?? []).map((r): ScreeningRow => ({ id: r.id, type: "consent", worker: r.worker_id, status: r.signed_at ? "signed" : "unsigned", date: r.created_at, version: r.document_version, provider: r.screening_orders.provider })),
  ];
}