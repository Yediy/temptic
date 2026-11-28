import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useContracts, useContractCatalog, useCreateContract } from "@/hooks/tto/use-contract-workflow";
import { oneYearEndDate } from "@/lib/tto/contract-validation";

type Draft = { reference: string; client_id: string; site_id: string; supervisor_id: string; work_details: string; pay_rate: string; bill_rate: string; currency: string; starts_on: string; ends_on: string };
const blank: Draft = { reference: "", client_id: "", site_id: "", supervisor_id: "", work_details: "", pay_rate: "", bill_rate: "", currency: "USD", starts_on: "", ends_on: "" };

export default function Contracts() {
  const navigate = useNavigate(); const { roles } = useAuth();
  const list = useContracts(); const catalog = useContractCatalog(); const create = useCreateContract();
  const [open, setOpen] = useState(false); const [draft, setDraft] = useState<Draft>(blank); const [selected, setSelected] = useState<string | null>(null);
  const [oneYear, setOneYear] = useState(false);
  const startNewContract = () => {
    const first = catalog.data?.agencyName === "Prostaffing" && list.data?.length === 0;
    const client = first ? catalog.data?.clients.find(c => c.company_name === "Acme Builders LLC") : undefined;
    const signers = client ? catalog.data?.supervisors.filter(s => s.client_id === client.id && !s.site_id && s.email) ?? [] : [];
    setDraft({ ...blank, reference: first ? "Acme Builders LLC · Framing" : "", client_id: client?.id ?? "", supervisor_id: signers.length === 1 ? signers[0].id : "", work_details: first ? "framing" : "", pay_rate: first ? "40" : "" });
    setOneYear(first); setOpen(true);
  };
  const set = (key: keyof Draft, value: string) => setDraft(v => ({ ...v, [key]: value }));
  const clientName = (id: string) => catalog.data?.clients.find(c => c.id === id)?.company_name ?? "Client unavailable";
  const supervisors = catalog.data?.supervisors.filter(s => s.client_id === draft.client_id && (!s.site_id || s.site_id === draft.site_id)) ?? [];
  const detail = list.data?.find(c => c.id === selected);
  const supervisor = catalog.data?.supervisors.find(s => s.id === detail?.supervisor_id);
  const canCreate = roles.some(r => ["agency_admin", "agency_owner", "super_admin"].includes(r));
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = await create.mutateAsync({ ...draft, site_id: draft.site_id || null, bill_rate: draft.bill_rate ? Number(draft.bill_rate) : null, ends_on: draft.ends_on || null });
      toast.success("Contract saved"); setOpen(false); navigate(`/tto/assignments?contract=${id}`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save contract"); }
  };
  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Contracts</h2>{canCreate && <Button disabled={list.isLoading || catalog.isLoading} onClick={startNewContract}><Plus className="mr-2 h-4 w-4" />New contract</Button>}</header>
    {(list.error || catalog.error) && <p role="alert" className="text-sm text-destructive">{String(list.error?.message ?? catalog.error?.message)}</p>}
    {list.isLoading && <p className="text-muted-foreground">Loading contracts…</p>}
    {!list.isLoading && list.data?.length === 0 && <p className="border-y py-10 text-center text-muted-foreground">No contracts yet.</p>}
    {!!list.data?.length && <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-muted-foreground"><th className="p-3">Contract</th><th className="p-3">Client</th><th className="p-3">Hourly pay</th><th className="p-3">Hourly bill</th><th className="p-3">Effective dates</th><th className="p-3" /></tr></thead><tbody>{list.data.map(c => <tr key={c.id} className="border-b"><td className="p-3"><Button variant="link" className="h-auto max-w-xs whitespace-normal p-0 text-left" onClick={() => setSelected(c.id)}>{c.reference}</Button></td><td className="p-3">{clientName(c.client_id)}</td><td className="whitespace-nowrap p-3 font-mono">{Number(c.pay_rate).toFixed(2)} {c.currency}</td><td className="whitespace-nowrap p-3 font-mono">{c.bill_rate == null ? "—" : `${Number(c.bill_rate).toFixed(2)} ${c.currency}`}</td><td className="whitespace-nowrap p-3">{c.starts_on} – {c.ends_on ?? "Open-ended"}</td><td className="p-3"><Button variant="outline" size="sm" onClick={() => navigate(`/tto/assignments?contract=${c.id}`)}>Assignments</Button></td></tr>)}</tbody></table></div>}
    {detail && <section className="space-y-4 border-t pt-5"><div className="flex items-center justify-between"><h3 className="font-semibold">{detail.reference}</h3><Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Close</Button></div><p className="whitespace-pre-wrap text-sm">{detail.work_details}</p><dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Contract supervisor</dt><dd>{supervisor ? `${supervisor.first_name} ${supervisor.last_name}` : "Supervisor unavailable"}</dd><dd className="break-all">{supervisor?.email}</dd></div><div><dt className="text-muted-foreground">Client</dt><dd>{clientName(detail.client_id)}</dd></div></dl></section>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>New contract</DialogTitle></DialogHeader>
      <form onSubmit={save} className="grid min-w-0 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Label htmlFor="contract-reference">Contract reference</Label><Input id="contract-reference" required maxLength={160} value={draft.reference} onChange={e => set("reference", e.target.value)} /></div>
        <div><Label>Client</Label><Select value={draft.client_id} onValueChange={v => setDraft(d => ({ ...d, client_id: v, site_id: "", supervisor_id: "" }))}><SelectTrigger aria-label="Contract client"><SelectValue placeholder="Choose client" /></SelectTrigger><SelectContent>{catalog.data?.clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Site (optional)</Label><Select value={draft.site_id || "none"} onValueChange={v => setDraft(d => ({ ...d, site_id: v === "none" ? "" : v, supervisor_id: "" }))}><SelectTrigger aria-label="Contract site"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Client-wide</SelectItem>{catalog.data?.sites.filter(s => s.client_id === draft.client_id).map(s => <SelectItem key={s.id} value={s.id}>{s.site_name || s.address_line1}</SelectItem>)}</SelectContent></Select></div>
        <div className="sm:col-span-2"><Label>Contract supervisor</Label><Select value={draft.supervisor_id} onValueChange={v => set("supervisor_id", v)}><SelectTrigger aria-label="Contract supervisor"><SelectValue placeholder="Choose supervisor" /></SelectTrigger><SelectContent>{supervisors.filter(s => s.email).map(s => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name} · {s.email}</SelectItem>)}</SelectContent></Select></div>
        <div className="sm:col-span-2"><Label htmlFor="contract-work">Work details</Label><Textarea id="contract-work" required maxLength={10000} rows={3} value={draft.work_details} onChange={e => set("work_details", e.target.value)} /></div>
        <div><Label htmlFor="agreed-pay">Agreed hourly pay</Label><Input id="agreed-pay" type="number" min="0.01" step="0.01" required value={draft.pay_rate} onChange={e => set("pay_rate", e.target.value)} /></div>
        <div><Label htmlFor="agreed-bill">Agreed hourly bill (optional)</Label><Input id="agreed-bill" type="number" min="0.01" step="0.01" value={draft.bill_rate} onChange={e => set("bill_rate", e.target.value)} /></div>
        <div><Label>Currency</Label><Select value={draft.currency} onValueChange={v => set("currency", v)}><SelectTrigger aria-label="Contract currency"><SelectValue /></SelectTrigger><SelectContent>{["USD", "CAD", "MXN", "EUR", "GBP"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Term</Label><Select value={oneYear ? "year" : "custom"} onValueChange={v => { setOneYear(v === "year"); if (v === "year") set("ends_on", oneYearEndDate(draft.starts_on)); }}><SelectTrigger aria-label="Contract term"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="year">One year</SelectItem><SelectItem value="custom">Custom dates</SelectItem></SelectContent></Select></div>
        <div><Label htmlFor="contract-start">Effective from</Label><Input id="contract-start" type="date" required value={draft.starts_on} onChange={e => { const starts_on = e.target.value; setDraft(d => ({ ...d, starts_on, ends_on: oneYear ? oneYearEndDate(starts_on) : d.ends_on })); }} /></div>
        <div><Label htmlFor="contract-end">Effective until {oneYear ? "" : "(optional)"}</Label><Input id="contract-end" type="date" readOnly={oneYear} required={oneYear} min={draft.starts_on} value={draft.ends_on} onChange={e => set("ends_on", e.target.value)} /></div>
        <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={create.isPending || !draft.client_id || !draft.supervisor_id}>{create.isPending ? "Saving…" : "Save contract"}</Button></div>
      </form>
    </DialogContent></Dialog>
  </div>;
}