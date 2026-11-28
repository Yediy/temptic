import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { calculatePayroll, weekBounds, validatePeriod, type PayPeriod, type Deduction, type PayrollTicket } from "./payroll-calculation.ts";
import type { ContractTerms } from "./contract-rates.ts";
const ELIGIBLE = ["approved", "payroll_ready", "billing_ready", "closed"];
export async function loadPayrollReview(admin: SupabaseClient, agencyId: string, period: PayPeriod, deductions: Deduction[] = [], ids?: string[], currency?: string) {
  validatePeriod(period); const bounds = weekBounds(period.period_start, period.period_end);
  const context: PayrollTicket[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await admin.from("tto_time_tickets").select("id,worker_id,work_date,regular_hours,overtime_hours,double_time_hours").eq("agency_id", agencyId).in("status", ELIGIBLE).gte("work_date", bounds.start).lte("work_date", bounds.end).order("work_date").order("id").range(offset, offset + 499);
    if (error) throw new Error(error.message); context.push(...data);
    if (data.length < 500) break;
  }
  let selected = context.filter(t => t.work_date >= period.period_start && t.work_date <= period.period_end && (!ids || ids.includes(t.id)));
  if (!ids) {
    const exported = new Set<string>();
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await admin.from("tto_payroll_batches").select("ticket_ids").eq("agency_id", agencyId).in("status", ["exported", "exporting"]).order("id").range(offset,offset+499);
      if (error) throw new Error(error.message); data.forEach(b => (b.ticket_ids ?? []).forEach((id: string) => exported.add(id)));
      if (data.length < 500) break;
    }
    selected = selected.filter(t => !exported.has(t.id));
  }
  if (ids && selected.length !== new Set(ids).size) throw new Error("Every batch ticket must be approved and inside its pay period.");
  const terms = new Map<string, ContractTerms>(); const rb = new Map<string, { exp: number; mile: number }>();
  for (let offset=0; offset<selected.length; offset+=500) {
    const chunk=selected.slice(offset,offset+500).map(t=>t.id);
    const tr=await admin.from("tto_ticket_terms").select("*").eq("agency_id",agencyId).in("time_ticket_id",chunk);
    if (tr.error) throw new Error(tr.error.message);
    for (const t of tr.data ?? []) terms.set(t.time_ticket_id,t as ContractTerms);
    for(let page=0;;page+=500){
      const er=await admin.from("tto_ticket_evidence").select("time_ticket_id,kind,amount,mileage_total").eq("agency_id",agencyId).in("time_ticket_id",chunk).eq("status","approved").in("kind",["expense","mileage"]).order("id").range(page,page+499);
      if(er.error)throw new Error(er.error.message);
      for (const e of er.data ?? []) { const r=rb.get(e.time_ticket_id)??{exp:0,mile:0}; if(e.kind==="expense")r.exp+=Number(e.amount??0);else r.mile+=Number(e.mileage_total??0);rb.set(e.time_ticket_id,r); }
      if(er.data.length<500)break;
    }
  }
  if (currency) selected=selected.filter(t=>terms.get(t.id)?.currency===currency || !terms.has(t.id));
  return calculatePayroll(period,selected,context,terms,rb,deductions);
}