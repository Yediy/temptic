import { useState } from "react";
import { ChevronDown, Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Deduction, PayrollReview } from "@/hooks/tto/use-payroll-review";
import { money } from "../../../supabase/functions/_shared/payroll-calculation";
type Draft={worker_id:string;label:string;amount:string};
export function PayrollReviewEditor({review,initial,locked,pending,onSave}:{review:PayrollReview;initial:Deduction[];locked:boolean;pending:boolean;onSave:(deductions:Deduction[])=>void}){
  const [drafts,setDrafts]=useState<Draft[]>(()=>initial.map(d=>({...d,amount:String(d.amount)})));
  const [expanded,setExpanded]=useState<string|null>(null);
  const currency=String(review.totals.currency??"USD");const cash=(n:number)=>`${money(n).toFixed(2)} ${currency}`;
  const deductions=drafts.map(d=>({...d,amount:Number(d.amount)}));
  const total=(id:string)=>money(deductions.filter(d=>d.worker_id===id).reduce((sum,d)=>sum+(Number.isFinite(d.amount)?d.amount:0),0));
  const invalid=deductions.some((d,i)=>!d.label.trim()||!drafts[i].amount.trim()||!Number.isFinite(d.amount)||d.amount<0||Math.abs(money(d.amount)-d.amount)>0.000001||!review.workers.some(w=>w.worker_id===d.worker_id));
  const excessive=review.workers.find(w=>total(w.worker_id)>w.gross_pay);
  const deducted=money(deductions.reduce((s,d)=>s+(Number.isFinite(d.amount)?d.amount:0),0));
  const gross=Number(review.totals.gross_pay??0);const reimbursement=Number(review.totals.reimbursements??0);
  const update=(i:number,key:keyof Draft,value:string)=>setDrafts(ds=>ds.map((d,j)=>j===i?{...d,[key]:value}:d));
  return <div className="space-y-6">
    <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-y py-5 lg:grid-cols-5">{[["Approved hours",`${Number(review.totals.regular_hours)+Number(review.totals.overtime_hours)+Number(review.totals.double_time_hours)} h`],["Gross pay",cash(gross)],["Deductions",cash(deducted)],["Reimbursements",cash(reimbursement)],["Payable",cash(gross-deducted+reimbursement)]].map(([label,value])=><div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-mono text-lg font-semibold">{value}</dd></div>)}</dl>
    <section className="space-y-3"><h3 className="font-semibold">Worker payroll</h3><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs text-muted-foreground">{["Worker","Regular","Overtime · 1.5×","Double time · 2×","Agreed rate","Gross","Deductions","Net pay",""].map((v,i)=><th key={i} className="whitespace-nowrap px-3 py-3">{v}</th>)}</tr></thead><tbody>{review.workers.map(w=><WorkerRows key={w.worker_id} worker={w} review={review} deduction={total(w.worker_id)} cash={cash} expanded={expanded===w.worker_id} onToggle={()=>setExpanded(expanded===w.worker_id?null:w.worker_id)} />)}</tbody></table></div></section>
    <section className="space-y-3 border-t pt-5"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Deductions</h3>{!locked&&<Button variant="outline" size="sm" onClick={()=>setDrafts(d=>[...d,{worker_id:review.workers[0]?.worker_id??"",label:"",amount:""}])}><Plus className="mr-2 h-4 w-4"/>Add deduction</Button>}</div>
      {!drafts.length&&<p className="text-sm text-muted-foreground">No deductions entered.</p>}
      {drafts.map((d,i)=><div key={i} className="grid min-w-0 grid-cols-[1fr_auto] items-end gap-3 border-b pb-3 sm:grid-cols-[1fr_1fr_10rem_auto]">
        <div><label className="text-xs text-muted-foreground" htmlFor={`ded-worker-${i}`}>Worker</label><Select value={d.worker_id} disabled={locked} onValueChange={v=>update(i,"worker_id",v)}><SelectTrigger id={`ded-worker-${i}`} aria-label={`Deduction ${i+1} worker`}><SelectValue/></SelectTrigger><SelectContent>{review.workers.map(w=><SelectItem key={w.worker_id} value={w.worker_id}>{w.worker_name}</SelectItem>)}</SelectContent></Select></div>
        <div className="col-start-1 sm:col-start-auto"><label className="text-xs text-muted-foreground" htmlFor={`ded-label-${i}`}>Description</label><Input id={`ded-label-${i}`} disabled={locked} maxLength={120} value={d.label} onChange={e=>update(i,"label",e.target.value)}/></div>
        <div className="col-start-1 sm:col-start-auto"><label className="text-xs text-muted-foreground" htmlFor={`ded-amount-${i}`}>Amount · {currency}</label><Input id={`ded-amount-${i}`} disabled={locked} type="number" min="0" step="0.01" value={d.amount} onChange={e=>update(i,"amount",e.target.value)}/></div>
        {!locked&&<Button variant="ghost" size="icon" title="Remove deduction" aria-label={`Remove deduction ${i+1}`} className="col-start-2 row-start-1 sm:col-start-auto sm:row-start-auto" onClick={()=>setDrafts(ds=>ds.filter((_,j)=>j!==i))}><Trash2 className="h-4 w-4"/></Button>}
      </div>)}
      {invalid&&<p role="alert" className="text-sm text-destructive">Each deduction needs a description and a valid amount.</p>}
      {excessive&&<p role="alert" className="text-sm text-destructive">Deductions exceed {excessive.worker_name}’s gross pay.</p>}
    </section>
    {!locked&&<div className="flex justify-end border-t pt-4"><Button disabled={pending||invalid||!!excessive} onClick={()=>onSave(deductions)}><Save className="mr-2 h-4 w-4"/>{pending?"Saving…":"Save payroll review"}</Button></div>}
  </div>;
}
function WorkerRows({worker:w,review,deduction,cash,expanded,onToggle}:{worker:PayrollReview["workers"][number];review:PayrollReview;deduction:number;cash:(n:number)=>string;expanded:boolean;onToggle:()=>void}){
  return <><tr className="border-b"><td className="min-w-40 px-3 py-3 font-medium">{w.worker_name}<span className="block text-xs text-muted-foreground">{w.worker_code}</span></td>{[`${w.regular_hours} h`,`${w.overtime_hours} h`,`${w.double_time_hours} h`,w.rates.map(cash).join(" / "),cash(w.gross_pay),cash(deduction),cash(w.gross_pay-deduction)].map((v,i)=><td key={i} className="whitespace-nowrap px-3 py-3 font-mono text-xs">{v}</td>)}<td><Button size="icon" variant="ghost" aria-label={`Show ${w.worker_name}'s approved hours`} title="Approved time tickets" aria-expanded={expanded} onClick={onToggle}><ChevronDown className={`h-4 w-4 ${expanded?"rotate-180":""}`}/></Button></td></tr>{expanded&&<tr><td colSpan={9} className="bg-muted/40 p-4"><div className="flex flex-wrap gap-5 text-xs"><span>Regular pay: {cash(w.regular_pay)}</span><span>Overtime pay: {cash(w.overtime_pay)}</span><span>Double-time pay: {cash(w.double_time_pay)}</span><span>Reimbursements: {cash(w.reimbursements)}</span></div>{review.tickets.filter(t=>t.worker_id===w.worker_id).map(t=><div key={t.id} className="mt-2 flex flex-wrap gap-4 text-xs"><span>{t.work_date}</span><span>{t.regular_hours} regular · {t.overtime_hours} overtime · {t.double_time_hours} double-time</span></div>)}</td></tr>}</>;
}