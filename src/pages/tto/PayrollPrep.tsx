import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useTtoPayrollBatches } from "@/hooks/tto/use-tto";
import { toast } from "sonner";
import { BatchList } from "@/components/tto/BatchList";
import { PayrollReviewEditor } from "@/components/tto/PayrollReviewEditor";
import { usePayrollReview, useSavePayrollReview, type Deduction } from "@/hooks/tto/use-payroll-review";
import { payPeriodEnd } from "@/lib/tto/pay-period";
import { Plus } from "lucide-react";

export default function PayrollPrep() {
  const { agencyId } = useAuth();
  const { data: batches, error: batchError } = useTtoPayrollBatches();
  const save = useSavePayrollReview();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [payDate,setPayDate]=useState("");const [type,setType]=useState("weekly");const [currency,setCurrency]=useState("USD");const [batchId,setBatchId]=useState<string|null>(null);
  const query=usePayrollReview(start,end,currency,batchId);
  const batch=query.data?.batch;const review=query.data?.review;
  const reviewBatch=(id:string)=>{const b=batches?.find(b=>b.id===id);if(!b)return;setBatchId(id);setStart(String(b.period_start));setEnd(String(b.period_end));setPayDate(b.pay_date?String(b.pay_date):"");setType(String(b.period_type??"custom"));};
  const run = async (deductions:Deduction[]) => {
    if (!agencyId || !start || !end || !payDate || payDate<end) { toast.error("Choose a pay date on or after period end"); return; }
    try { const r = await save.mutateAsync(batchId?{action:"save",batch_id:batchId,pay_date:payDate,period_type:type,deductions}:{action:"prepare",agency_id:agencyId,period_start:start,period_end:end,pay_date:payDate,period_type:type,currency,deductions});
      if(r.batch)setBatchId(r.batch.id);toast.success("Payroll review saved"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Payroll preparation failed"); }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Payroll Prep</h2>{batch&&<p className="mt-1 text-sm text-muted-foreground">{batch.name} · {batch.status}</p>}</div><Button variant="outline" onClick={()=>{setBatchId(null);setStart("");setEnd("");setPayDate("");setType("weekly");}}><Plus className="mr-2 h-4 w-4"/>New pay period</Button></header>
      <section className="grid gap-4 border-y py-5 sm:grid-cols-2 lg:grid-cols-5">
        <div><Label>Pay period</Label><Select value={type} disabled={!!batchId} onValueChange={v=>{setType(v);const next=payPeriodEnd(start,v);if(next)setEnd(next);}}><SelectTrigger aria-label="Pay period frequency"><SelectValue/></SelectTrigger><SelectContent>{[["weekly","Weekly"],["biweekly","Every two weeks"],["semimonthly","Twice monthly"],["monthly","Monthly"],["custom","Custom dates"]].map(([v,l])=><SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
        <div><Label htmlFor="payroll-start">Period start</Label><Input id="payroll-start" type="date" disabled={!!batchId} value={start} onChange={e=>{setStart(e.target.value);const next=payPeriodEnd(e.target.value,type);if(next)setEnd(next);}}/></div>
        <div><Label htmlFor="payroll-end">Period end</Label><Input id="payroll-end" type="date" disabled={!!batchId} min={start} value={end} onChange={e=>{setEnd(e.target.value);setType("custom");}}/></div>
        <div><Label htmlFor="payroll-date">Pay date</Label><Input id="payroll-date" type="date" disabled={batch?.status==="exported"||batch?.status==="exporting"} min={end} value={payDate} onChange={e=>setPayDate(e.target.value)}/></div>
        <div><Label>Currency</Label><Select value={String(review?.totals.currency??currency)} disabled={!!batchId} onValueChange={setCurrency}><SelectTrigger aria-label="Payroll currency"><SelectValue/></SelectTrigger><SelectContent>{["USD","CAD","MXN","EUR","GBP"].map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
      </section>
      {(query.error||batchError)&&<p role="alert" className="text-sm text-destructive">{query.error?.message??batchError?.message}</p>}
      {query.isFetching&&<p className="text-sm text-muted-foreground">Calculating approved payroll…</p>}
      {!start&&!batchId&&<p className="border-b py-6 text-sm text-muted-foreground">No pay period selected.</p>}
      {query.data&&!review&&<div className="border-b py-8"><h3 className="font-medium">No approved work in this pay period</h3><Button asChild variant="link" className="px-0"><a href="/tto/assignments">Assignments</a></Button></div>}
      {review&&review.workers?.length>0&&<PayrollReviewEditor key={`${batchId??`${start}:${end}:${currency}`}:${JSON.stringify(batch?.deductions??[])}`} review={review} initial={batch?.deductions??[]} locked={batch?.status==="exported"||batch?.status==="exporting"} pending={save.isPending} onSave={run}/>}
      <section className="space-y-3 border-t pt-5"><h3 className="font-semibold">Payroll batches</h3><BatchList kind="payroll" batches={(batches??[]).filter((b):b is Record<string,unknown>&{id:string}=>typeof b.id==="string")} onReview={reviewBatch}/></section>
    </div>
  );
}
