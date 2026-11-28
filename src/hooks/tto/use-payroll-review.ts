import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Deduction, PayrollReview } from "../../../supabase/functions/_shared/payroll-calculation";
export type { Deduction, PayrollReview };
export type PayrollBatch = { id:string;name:string;period_start:string;period_end:string;pay_date:string|null;period_type:string;status:string;deductions:Deduction[];ticket_ids:string[];totals:Record<string,unknown>;file_path:string|null };
export async function payrollRequest(body:Record<string,unknown>,name="tto-payroll-review"):Promise<{review:PayrollReview|null;batch:PayrollBatch|null}> {
  const {data,error}=await supabase.functions.invoke(name,{body});
  if(error){let message=error.message;try{message=(await error.context.json()).error??message;}catch{/* no response body */}throw new Error(message);}
  if(data?.error)throw new Error(data.error);return data;
}
export function usePayrollReview(start:string,end:string,currency:string,batchId:string|null){
  const {agencyId}=useAuth();
  return useQuery({queryKey:["tto-payroll-review",agencyId,start,end,currency,batchId],enabled:!!agencyId&&(!!batchId||!!start&&!!end&&end>=start),queryFn:()=>payrollRequest(batchId?{action:"batch",batch_id:batchId}:{action:"preview",agency_id:agencyId,period_start:start,period_end:end,currency})});
}
export function useSavePayrollReview(){
  const qc=useQueryClient();
  return useMutation({mutationFn:(body:Record<string,unknown>)=>payrollRequest(body,body.action==="prepare"?"tto-prepare-payroll":"tto-payroll-review"),onSuccess:()=>{void qc.invalidateQueries({queryKey:["tto-payroll-batches"]});void qc.invalidateQueries({queryKey:["tto-payroll-review"]});}});
}