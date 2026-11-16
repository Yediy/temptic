import { supabase } from "@/integrations/supabase/client";
import type { ScreeningDocument } from "./documents";

export async function readAgencyScreening(kind: "report" | "consent", id: string, agencyId: string): Promise<ScreeningDocument[]> {
  const result = kind === "report"
    ? await supabase.from("screening_reports").select("id,order_id,result,summary,received_at,document_version,screening_orders!inner(agency_id)").eq("id", id).eq("screening_orders.agency_id", agencyId).maybeSingle()
    : await supabase.from("screening_consents").select("id,order_id,consent_type,consent_text,signed_at,created_at,document_version,screening_orders!inner(agency_id)").eq("id", id).eq("screening_orders.agency_id", agencyId).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) return [];
  const { error } = await supabase.rpc("log_screening_access", { _record_type: kind, _record_ids: [id], _context: "compliance document review" });
  if (error) throw new Error("Access could not be recorded. This document has not been displayed.");
  return [result.data as ScreeningDocument];
}