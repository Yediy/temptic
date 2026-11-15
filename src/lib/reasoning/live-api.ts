import { supabase } from "@/integrations/supabase/client";
import { adaptLiveRead, CapabilityForbidden } from "./live-data";
import { type ReasoningCapabilityKey } from "./platform";

type Table = "woic_cognitive_requests" | "woic_reasoning_traces";
type Row = Record<string, unknown>;

/** Every page and ID lookup is tenant-scoped, in addition to existing database RLS. */
async function readRows(table: Table, agencyId: string, id?: string): Promise<Row[]> {
  const rows: Row[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    let query = supabase.from(table).select("*").eq("agency_id", agencyId)
      .order("created_at", { ascending: false }).order("id", { ascending: false });
    if (table === "woic_cognitive_requests") query = query.eq("service", "reasoning");
    if (id) query = query.eq("id", id);
    const { data, error } = await query.range(offset, offset + pageSize - 1);
    if (error) {
      if (error.code === "42501") throw new CapabilityForbidden(error.message);
      throw new Error(error.message);
    }
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}

export async function readLiveReasoning(agencyId: string, capability: ReasoningCapabilityKey, params: Row = {}) {
  const requestId = capability === "reasoning.requests.get" ? params.request_id : undefined;
  const conclusionId = capability === "reasoning.conclusions.get" ? params.conclusion_id : undefined;
  if ((capability.endsWith(".get")) && typeof (requestId ?? conclusionId) !== "string") {
    throw new Error("A record ID is required.");
  }
  const [requests, traces] = await Promise.all([
    readRows("woic_cognitive_requests", agencyId, typeof requestId === "string" ? requestId : undefined),
    readRows("woic_reasoning_traces", agencyId, typeof conclusionId === "string" ? conclusionId : undefined),
  ]);
  return adaptLiveRead(capability, requests, traces, params);
}