import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useContractCatalog, useContracts, useContractAssignments, useCreateContract, useCreateContractAssignment, useCreateContractTicket } from "@/hooks/tto/use-contract-workflow";
import { useTtoSubmit } from "@/hooks/tto/use-tto";
import { oneYearEndDate } from "@/lib/tto/contract-validation";
import { billRateFromMarkup } from "../../../supabase/functions/_shared/contract-invoice";
import { shiftFromHours } from "@/lib/tto/ticket-entry";

const NEW = "new";
export default function NewTimeTicket() {
  const qc = useQueryClient();
  const catalog = useContractCatalog(); const contracts = useContracts(); const assignments = useContractAssignments();
  const createContract = useCreateContract(); const createAssignment = useCreateContractAssignment(); const createTicket = useCreateContractTicket(); const submit = useTtoSubmit();
  const [worker, setWorker] = useState(""); const [client, setClient] = useState(""); const [assignmentId, setAssignmentId] = useState("");
  const [supervisor, setSupervisor] = useState(""); const [work, setWork] = useState(""); const [pay, setPay] = useState(""); const [currency, setCurrency] = useState("USD"); const [markup, setMarkup] = useState("");
  const [startsOn, setStartsOn] = useState(""); const [endsOn, setEndsOn] = useState("");
  const [workDate, setWorkDate] = useState(""); const [startTime, setStartTime] = useState(""); const [hours, setHours] = useState(""); const [zone, setZone] = useState("America/New_York");
  const [done, setDone] = useState<string | null>(null); const [busy, setBusy] = useState(false);

  const matching = useMemo(() => (assignments.data ?? []).filter(a => a.worker_id === worker && a.client_id === client && a.status === "active"), [assignments.data, worker, client]);
  const contractFor = (id: string | null) => contracts.data?.find(c => c.id === id);
  const chosen = matching.find(a => a.id === assignmentId);
  const supervisors = (catalog.data?.supervisors ?? []).filter(s => s.client_id === client && s.email);
  const isNew = assignmentId === NEW;
  const agreed = isNew ? (pay ? `${Number(pay).toFixed(2)} ${currency}/h` : "—") : chosen ? `${Number(contractFor(chosen.contract_id)?.pay_rate).toFixed(2)} ${contractFor(chosen.contract_id)?.currency}/h` : "—";
  const estimate = (() => { const c = isNew ? { pay_rate: Number(pay), currency } : contractFor(chosen?.contract_id ?? null); const h = Number(hours); return c && h > 0 && Number(c.pay_rate) > 0 ? `${(h * Number(c.pay_rate)).toFixed(2)} ${c.currency}` : null; })();

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const shift = shiftFromHours(workDate, startTime, Number(hours), zone);
      let assignment = assignmentId;
      if (isNew) {
        const contractId = await createContract.mutateAsync({ reference: `${catalog.data?.clients.find(c => c.id === client)?.company_name ?? "Client"} · ${work.trim().slice(0, 80)}`, client_id: client, site_id: null, supervisor_id: supervisor, work_details: work, pay_rate: Number(pay), bill_rate: markup ? billRateFromMarkup(Number(pay), Number(markup)) : null, currency, starts_on: startsOn, ends_on: endsOn || null });
        assignment = await createAssignment.mutateAsync({ contract_id: contractId, worker_id: worker, starts_on: startsOn, ends_on: endsOn || null });
      }
      const ticketId = await createTicket.mutateAsync({ assignment_id: assignment, work_date: workDate, ...shift });
      await submit.mutateAsync({ time_ticket_id: ticketId });
      void qc.invalidateQueries({ queryKey: ["tto-contracted-tickets"] }); void qc.invalidateQueries({ queryKey: ["tto-assignments"] });
      setDone(ticketId); toast.success("Time ticket submitted for supervisor approval");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Could not create the time ticket"); }
    finally { setBusy(false); }
  };

  if (done) return <section className="space-y-4 border-y py-8"><h2 className="text-xl font-semibold">Time ticket submitted</h2><p className="text-sm text-muted-foreground">The contract supervisor approves it next. Approved tickets appear in Payroll Prep, where Generate export produces the CSV.</p><div className="flex flex-wrap gap-2"><Button asChild><Link to="/tto/approvals">Approvals</Link></Button><Button asChild variant="outline"><Link to="/tto/payroll">Payroll Prep</Link></Button><Button variant="ghost" onClick={() => { setDone(null); setWorkDate(""); setStartTime(""); setHours(""); }}>Enter another</Button></div></section>;

  return <form onSubmit={save} className="space-y-6">
    <h2 className="text-xl font-semibold">New time ticket</h2>
    {(catalog.error || contracts.error || assignments.error) && <p role="alert" className="text-sm text-destructive">{String((catalog.error ?? contracts.error ?? assignments.error)?.message)}</p>}
    <section className="grid gap-4 sm:grid-cols-2">
      <div><Label>Worker</Label><Select value={worker} onValueChange={v => { setWorker(v); setAssignmentId(""); }}><SelectTrigger aria-label="Worker"><SelectValue placeholder="Choose worker" /></SelectTrigger><SelectContent>{catalog.data?.workers.map(w => <SelectItem key={w.id} value={w.id}>{w.first_name} {w.last_name}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Client</Label><Select value={client} onValueChange={v => { setClient(v); setAssignmentId(""); setSupervisor(""); }}><SelectTrigger aria-label="Client"><SelectValue placeholder="Choose client" /></SelectTrigger><SelectContent>{catalog.data?.clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent></Select></div>
      <div className="sm:col-span-2"><Label>Assignment</Label><Select value={assignmentId} disabled={!worker || !client} onValueChange={setAssignmentId}><SelectTrigger aria-label="Assignment"><SelectValue placeholder={worker && client ? "Choose assignment" : "Choose worker and client first"} /></SelectTrigger><SelectContent>{matching.map(a => { const c = contractFor(a.contract_id); return <SelectItem key={a.id} value={a.id}>{c?.reference ?? "Contract"} · {a.starts_on} – {a.ends_on ?? "open"}</SelectItem>; })}<SelectItem value={NEW}>New contract and assignment</SelectItem></SelectContent></Select></div>
    </section>
    {isNew && <section className="grid gap-4 border-t pt-5 sm:grid-cols-2">
      <div className="sm:col-span-2"><Label>Contract supervisor (approves the ticket)</Label><Select value={supervisor} onValueChange={setSupervisor}><SelectTrigger aria-label="Contract supervisor"><SelectValue placeholder={supervisors.length ? "Choose supervisor" : "This client has no supervisor with an email"} /></SelectTrigger><SelectContent>{supervisors.map(s => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name} · {s.email}</SelectItem>)}</SelectContent></Select></div>
      <div className="sm:col-span-2"><Label htmlFor="ticket-work">Contracted work</Label><Textarea id="ticket-work" required maxLength={10000} rows={2} value={work} onChange={e => setWork(e.target.value)} /></div>
      <div><Label htmlFor="ticket-pay">Agreed hourly pay</Label><Input id="ticket-pay" type="number" min="0.01" step="0.01" required value={pay} onChange={e => setPay(e.target.value)} /></div>
      <div><Label htmlFor="ticket-markup">Client markup %</Label><Input id="ticket-markup" type="number" min="0" max="500" step="0.1" value={markup} onChange={e => setMarkup(e.target.value)} /><p className="mt-1 text-xs text-muted-foreground">{pay && markup ? `Client bill rate: ${(Number(pay) * (1 + Number(markup) / 100)).toFixed(2)} ${currency}/h` : "Needed to invoice the client"}</p></div>
      <div><Label>Currency</Label><Select value={currency} onValueChange={setCurrency}><SelectTrigger aria-label="Currency"><SelectValue /></SelectTrigger><SelectContent>{["USD", "CAD", "MXN", "EUR", "GBP"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
      <div><Label htmlFor="ticket-starts">Contract starts</Label><Input id="ticket-starts" type="date" required value={startsOn} onChange={e => { setStartsOn(e.target.value); setEndsOn(oneYearEndDate(e.target.value)); }} /></div>
      <div><Label htmlFor="ticket-ends">Contract ends</Label><Input id="ticket-ends" type="date" min={startsOn} value={endsOn} onChange={e => setEndsOn(e.target.value)} /></div>
    </section>}
    <section className="grid gap-4 border-t pt-5 sm:grid-cols-2 lg:grid-cols-4">
      <div><Label htmlFor="ticket-date">Work date</Label><Input id="ticket-date" type="date" required min={chosen?.starts_on ?? (startsOn || undefined)} max={chosen?.ends_on ?? (endsOn || undefined)} value={workDate} onChange={e => setWorkDate(e.target.value)} /></div>
      <div><Label htmlFor="ticket-start">Start time</Label><Input id="ticket-start" type="time" required value={startTime} onChange={e => setStartTime(e.target.value)} /></div>
      <div><Label htmlFor="ticket-hours">Hours worked</Label><Input id="ticket-hours" type="number" min="0.25" max="24" step="0.25" required value={hours} onChange={e => setHours(e.target.value)} /></div>
      <div><Label>Time zone</Label><Select value={zone} onValueChange={setZone}><SelectTrigger aria-label="Time zone"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="America/New_York">Eastern</SelectItem><SelectItem value="America/Chicago">Central</SelectItem><SelectItem value="America/Denver">Mountain</SelectItem><SelectItem value="America/Los_Angeles">Pacific</SelectItem></SelectContent></Select></div>
    </section>
    <dl className="flex flex-wrap gap-8 border-y py-4 text-sm"><div><dt className="text-muted-foreground">Agreed pay</dt><dd className="font-mono">{agreed}</dd></div>{estimate && <div><dt className="text-muted-foreground">Hours × agreed pay (Payroll Prep applies weekly overtime and deductions)</dt><dd className="font-mono">{estimate}</dd></div>}</dl>
    <div className="flex justify-end"><Button type="submit" disabled={busy || !worker || !client || !assignmentId || (isNew && !supervisor)}>{busy ? "Submitting…" : "Create and submit for approval"}</Button></div>
  </form>;
}