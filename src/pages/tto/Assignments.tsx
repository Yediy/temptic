import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useContracts, useContractCatalog, useContractAssignments, useContractTickets, useCreateContractAssignment, useCreateContractTicket, type Assignment } from "@/hooks/tto/use-contract-workflow";
import { useTtoSubmit } from "@/hooks/tto/use-tto";

export default function Assignments() {
  const [search] = useSearchParams(); const qc = useQueryClient(); const { roles } = useAuth();
  const contracts = useContracts(); const catalog = useContractCatalog(); const assignments = useContractAssignments(); const tickets = useContractTickets();
  const create = useCreateContractAssignment(); const createTicket = useCreateContractTicket(); const submit = useTtoSubmit();
  const [open, setOpen] = useState(false); const [contractId, setContract] = useState(search.get("contract") ?? "");
  const [worker, setWorker] = useState(""); const [start, setStart] = useState(""); const [end, setEnd] = useState("");
  const [ticketAssignment, setTicketAssignment] = useState<Assignment | null>(null); const [workDate, setWorkDate] = useState(""); const [workedFrom, setWorkedFrom] = useState(""); const [workedUntil, setWorkedUntil] = useState("");
  const c = contracts.data?.find(v => v.id === contractId);
  const canManage = roles.some(r => ["agency_admin", "agency_owner", "super_admin", "dispatcher"].includes(r));
  const workerName = (id: string) => { const w = catalog.data?.workers.find(w => w.id === id); return w ? `${w.first_name} ${w.last_name}` : "Worker unavailable"; };
  const save = async (e: React.FormEvent) => { e.preventDefault(); try { await create.mutateAsync({ contract_id: contractId, worker_id: worker, starts_on: start, ends_on: end || null }); setOpen(false); toast.success("Assignment created"); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not create assignment"); } };
  const saveTicket = async (e: React.FormEvent) => {
    e.preventDefault(); if (!ticketAssignment) return;
    if (!!workedFrom !== !!workedUntil) return toast.error("Provide both worked timestamps or leave both blank");
    try { await createTicket.mutateAsync({ assignment_id: ticketAssignment.id, work_date: workDate, actual_start: workedFrom ? new Date(workedFrom).toISOString() : null, actual_end: workedUntil ? new Date(workedUntil).toISOString() : null }); setTicketAssignment(null); toast.success("Time ticket created with agreed contract terms"); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not create ticket"); }
  };
  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Assignments</h2>{canManage && <Button onClick={() => { setStart(c?.starts_on ?? ""); setEnd(c?.ends_on ?? ""); setWorker(""); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />New assignment</Button>}</header>
    {(contracts.error || assignments.error || tickets.error || catalog.error) && <p role="alert" className="text-sm text-destructive">{String(contracts.error?.message ?? assignments.error?.message ?? tickets.error?.message ?? catalog.error?.message)}</p>}
    {assignments.isLoading && <p className="text-muted-foreground">Loading assignments…</p>}
    {assignments.data?.length === 0 && <p className="border-y py-10 text-center text-muted-foreground">No contracted assignments yet.</p>}
    {!!assignments.data?.length && <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-muted-foreground"><th className="p-3">Worker</th><th className="p-3">Contract</th><th className="p-3">Agreed pay</th><th className="p-3">Dates</th><th className="p-3">Status</th><th className="p-3" /></tr></thead><tbody>{assignments.data.map(a => { const ct = contracts.data?.find(c => c.id === a.contract_id); return <tr className="border-b" key={a.id}><td className="p-3">{workerName(a.worker_id)}</td><td className="p-3">{ct?.reference ?? "Contract unavailable"}</td><td className="whitespace-nowrap p-3 font-mono">{ct ? `${Number(ct.pay_rate).toFixed(2)} ${ct.currency}/h` : "—"}</td><td className="whitespace-nowrap p-3">{a.starts_on} – {a.ends_on ?? "Open-ended"}</td><td className="p-3"><Badge variant="outline">{a.status}</Badge></td><td className="p-3">{canManage && <Button variant="outline" size="sm" disabled={a.status !== "active"} onClick={() => { setTicketAssignment(a); setWorkDate(""); setWorkedFrom(""); setWorkedUntil(""); }}>Create time ticket</Button>}</td></tr>; })}</tbody></table></div>}
    <section className="space-y-3 border-t pt-5"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Time tickets</h3><Button variant="outline" asChild><Link to="/tto/payroll">Payroll Prep</Link></Button></div>
      {tickets.data?.tickets.length === 0 && <p className="py-4 text-sm text-muted-foreground">No time tickets yet.</p>}
      {tickets.data?.tickets.map(t => { const terms = tickets.data.terms.find(v => v.time_ticket_id === t.id); return <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-4"><div className="min-w-0 space-y-1"><p className="font-medium">{terms?.worker_name ?? workerName(t.worker_id)} · {t.work_date}</p><p className="text-sm text-muted-foreground">{terms?.contract_reference ?? "Contract missing"} · {terms?.client_name} · {terms ? `${Number(terms.pay_rate).toFixed(2)} ${terms.currency}/h` : "Rate missing"}</p><p className="text-xs text-muted-foreground">Regular {t.regular_hours}h · Overtime {t.overtime_hours}h · Double time {t.double_time_hours}h</p></div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{t.status}</Badge>{canManage && ["open", "in_progress", "rejected", "corrected"].includes(t.status) && <Button size="sm" disabled={submit.isPending || !t.actual_start || !t.actual_end} onClick={async () => { try { await submit.mutateAsync({ time_ticket_id: t.id }); void qc.invalidateQueries({ queryKey: ["tto-contracted-tickets"] }); toast.success("Time submitted for approval"); } catch (e) { toast.error(e instanceof Error ? e.message : "Submission failed"); } }}>Submit time</Button>}{t.status === "submitted" && <Button size="sm" variant="outline" asChild><Link to="/tto/approvals">Review</Link></Button>}</div></div>; })}
    </section>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>New assignment</DialogTitle></DialogHeader><form onSubmit={save} className="space-y-4">
      <div><Label>Contract</Label><Select value={contractId} onValueChange={id => { setContract(id); const v = contracts.data?.find(c => c.id === id); setStart(v?.starts_on ?? ""); setEnd(v?.ends_on ?? ""); }}><SelectTrigger aria-label="Assignment contract"><SelectValue placeholder="Choose contract" /></SelectTrigger><SelectContent>{contracts.data?.map(c => <SelectItem key={c.id} value={c.id}>{c.reference} · {Number(c.pay_rate).toFixed(2)} {c.currency}/h</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Worker</Label><Select value={worker} onValueChange={setWorker}><SelectTrigger aria-label="Assigned worker"><SelectValue placeholder="Choose worker" /></SelectTrigger><SelectContent>{catalog.data?.workers.map(w => <SelectItem key={w.id} value={w.id}>{workerName(w.id)}</SelectItem>)}</SelectContent></Select></div>
      <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="assignment-start">Starts on</Label><Input id="assignment-start" required type="date" min={c?.starts_on} max={c?.ends_on ?? undefined} value={start} onChange={e => setStart(e.target.value)} /></div><div><Label htmlFor="assignment-end">Ends on {c?.ends_on ? "" : "(optional)"}</Label><Input id="assignment-end" required={!!c?.ends_on} type="date" min={start} max={c?.ends_on ?? undefined} value={end} onChange={e => setEnd(e.target.value)} /></div></div>
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={create.isPending || !contractId || !worker}>{create.isPending ? "Saving…" : "Create assignment"}</Button></div>
    </form></DialogContent></Dialog>
    <Dialog open={!!ticketAssignment} onOpenChange={v => { if (!v) setTicketAssignment(null); }}><DialogContent><DialogHeader><DialogTitle>Create time ticket</DialogTitle></DialogHeader><form className="space-y-4" onSubmit={saveTicket}>
      <p className="text-sm">{ticketAssignment ? workerName(ticketAssignment.worker_id) : ""}</p><div><Label htmlFor="ticket-work-date">Work date</Label><Input id="ticket-work-date" required type="date" min={ticketAssignment?.starts_on} max={ticketAssignment?.ends_on ?? undefined} value={workDate} onChange={e => setWorkDate(e.target.value)} /></div>
      <div><Label htmlFor="worked-from">Worked from (optional)</Label><Input id="worked-from" type="datetime-local" value={workedFrom} onChange={e => setWorkedFrom(e.target.value)} /></div>
      <div><Label htmlFor="worked-until">Worked until (optional)</Label><Input id="worked-until" type="datetime-local" value={workedUntil} onChange={e => setWorkedUntil(e.target.value)} /></div>
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setTicketAssignment(null)}>Cancel</Button><Button type="submit" disabled={createTicket.isPending}>{createTicket.isPending ? "Creating…" : "Create time ticket"}</Button></div>
    </form></DialogContent></Dialog>
  </div>;
}