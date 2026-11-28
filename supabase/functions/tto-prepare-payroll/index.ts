// tto-prepare-payroll: compute labor cost lines for an approved ticket set.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withSentry } from "../_shared/sentry.ts";
import { requireUser, jsonResponse } from "../_shared/auth.ts";
import { hasAgencyRole, TTO_PAYROLL } from "../_shared/tto_access.ts";
import { z } from "npm:zod@3";
import { loadPayrollReview } from "../_shared/payroll-data.ts";

Deno.serve(withSentry("tto-prepare-payroll", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  let body: unknown;
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON", code: "bad_request" }, 400, corsHeaders); }
  const parsed=z.object({agency_id:z.string().uuid(),period_start:z.string(),period_end:z.string(),pay_date:z.string(),period_type:z.enum(["weekly","biweekly","semimonthly","monthly","custom"]),currency:z.string().regex(/^[A-Z]{3}$/),deductions:z.array(z.object({worker_id:z.string().uuid(),label:z.string().trim().min(1).max(120),amount:z.number().finite().nonnegative()})).max(200).default([]),name:z.string().max(200).optional()}).safeParse(body);
  if(!parsed.success)return jsonResponse({error:parsed.error.message},400,corsHeaders);
  const {agency_id,period_start,period_end,pay_date,period_type,currency,deductions}=parsed.data;
  const name=parsed.data.name??`Payroll ${period_start}–${period_end}`;

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  if (!(await hasAgencyRole(admin, auth.user.id, agency_id, TTO_PAYROLL))) return jsonResponse({ error: "Forbidden", code: "forbidden" }, 403, corsHeaders);
  try{
    const review=await loadPayrollReview(admin,agency_id,{period_start,period_end,pay_date},deductions,undefined,currency);
    const {data:batch,error}=await admin.from("tto_payroll_batches").insert({agency_id,name,period_start,period_end,pay_date,period_type,deductions,status:"prepared",ticket_ids:review.tickets.map(t=>t.id),totals:review.totals,payroll_snapshot:{workers:review.workers,tickets:review.tickets,totals:review.totals},created_by:auth.user.id}).select().single();
    if(error)return jsonResponse({error:error.message},500,corsHeaders);
    await admin.from("tto_audit_events").insert({agency_id,actor_id:auth.user.id,actor_kind:"agency",action:"payroll.prepared",updated_value:{batch_id:batch.id,pay_date,ticket_count:review.tickets.length}});
    return jsonResponse({ok:true,batch,review},200,corsHeaders);
  }catch(e){return jsonResponse({error:e instanceof Error?e.message:"Payroll preparation failed"},409,corsHeaders);}
}));
