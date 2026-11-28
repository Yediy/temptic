import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { requireUser, jsonResponse } from "../_shared/auth.ts";
import { withSentry } from "../_shared/sentry.ts";
import { hasAgencyRole, TTO_PAYROLL } from "../_shared/tto_access.ts";
import { loadPayrollReview } from "../_shared/payroll-data.ts";
const schema = z.object({ action:z.enum(["preview","batch","save"]), agency_id:z.string().uuid().optional(), batch_id:z.string().uuid().optional(), period_start:z.string().optional(), period_end:z.string().optional(), currency:z.string().regex(/^[A-Z]{3}$/).optional(), pay_date:z.string().optional(), period_type:z.enum(["weekly","biweekly","semimonthly","monthly","custom"]).optional(), deductions:z.array(z.object({worker_id:z.string().uuid(),label:z.string().trim().min(1).max(120),amount:z.number().finite().nonnegative()})).max(200).default([]) });
Deno.serve(withSentry("tto-payroll-review",async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST")return jsonResponse({error:"Method not allowed"},405,corsHeaders);
  const auth=await requireUser(req,corsHeaders);if(auth instanceof Response)return auth;
  let raw:unknown;try{const text=await req.text();if(text.length>65536)throw new Error();raw=JSON.parse(text);}catch{return jsonResponse({error:"Invalid or oversized payroll request"},400,corsHeaders);}
  const parsed=schema.safeParse(raw);if(!parsed.success)return jsonResponse({error:parsed.error.message},400,corsHeaders);
  const v=parsed.data;const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let batch:Record<string,any>|null=null;let agency=v.agency_id;
  if(v.action!=="preview"){
    if(!v.batch_id)return jsonResponse({error:"Choose a payroll batch"},400,corsHeaders);
    const r=await admin.from("tto_payroll_batches").select("*").eq("id",v.batch_id).maybeSingle();
    if(r.error)return jsonResponse({error:r.error.message},500,corsHeaders);batch=r.data;if(!batch)return jsonResponse({error:"Batch not found"},404,corsHeaders);agency=batch.agency_id;
  }
  if(!agency || !(await hasAgencyRole(admin,auth.user.id,agency,TTO_PAYROLL)))return jsonResponse({error:"Payroll access denied"},403,corsHeaders);
  if(batch?.status==="exported" && v.action==="batch")return jsonResponse({batch,review:batch.payroll_snapshot},200,corsHeaders);
  if(v.action==="save" && (!v.pay_date || !v.period_type))return jsonResponse({error:"Choose a pay date and period type"},400,corsHeaders);
  try{
    const period={period_start:batch?.period_start??v.period_start??"",period_end:batch?.period_end??v.period_end??"",pay_date:v.action==="save"?v.pay_date:batch?.pay_date??v.pay_date};
    const deductions=v.action==="save"?v.deductions:batch?.deductions??[];
    const review=await loadPayrollReview(admin,agency,period,deductions,batch?.ticket_ids,v.action==="preview"?v.currency:undefined);
    if(v.action==="save"){
      const snapshot={workers:review.workers,tickets:review.tickets,totals:review.totals};
      const r=await admin.rpc("save_tto_payroll_review",{_batch_id:batch?.id,_actor_id:auth.user.id,_deductions:v.deductions,_pay_date:v.pay_date,_period_type:v.period_type,_totals:review.totals,_snapshot:snapshot});
      if(r.error)return jsonResponse({error:r.error.message},409,corsHeaders);batch=r.data;
    }
    return jsonResponse({batch,review},200,corsHeaders);
  }catch(e){const message=e instanceof Error?e.message:"Payroll review failed";if(v.action==="preview"&&message.startsWith("No approved"))return jsonResponse({review:null,batch:null},200,corsHeaders);return jsonResponse({error:message},409,corsHeaders);}
}));