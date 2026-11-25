import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { usePayRates, useBillRates, useUpsertPayRate, useUpsertBillRate } from "@/hooks/pb/use-pb";
import { toast } from "sonner";

const PAY_TYPES = ["regular", "overtime", "double_time", "holiday", "shift_diff", "bonus", "per_diem", "mileage"];
const BILL_TYPES = ["regular", "overtime", "double_time", "holiday", "shift_diff", "travel", "expense"];
const CURRENCIES = ["USD", "CAD", "MXN", "EUR", "GBP"];

export default function RateBook() {
  const { agencyId } = useAuth();
  const { data: people } = useQuery({
    queryKey: ["ratebook-people", agencyId], enabled: !!agencyId,
    queryFn: async () => {
      const [w, c] = await Promise.all([
        supabase.from("workers").select("id,first_name,last_name").eq("agency_id", agencyId!).order("last_name"),
        supabase.from("clients").select("id,company_name").eq("agency_id", agencyId!).order("company_name"),
      ]);
      if (w.error) throw w.error; if (c.error) throw c.error;
      return { workers: w.data ?? [], clients: c.data ?? [] };
    },
  });
  const workerName = (id: unknown) => { const w = people?.workers.find(x => x.id === id); return w ? `${w.first_name ?? ""} ${w.last_name ?? ""}`.trim() : String(id).slice(0, 8); };
  const clientName = (id: unknown) => people?.clients.find(x => x.id === id)?.company_name ?? String(id).slice(0, 8);
  const today = new Date().toISOString().slice(0, 10);
  const { data: pays = [] } = usePayRates(agencyId ?? undefined);
  const { data: bills = [] } = useBillRates(agencyId ?? undefined);
  const addPay = useUpsertPayRate();
  const addBill = useUpsertBillRate();
  const [pw, setPw] = useState({ worker_id: "", rate_type: "regular", amount: "", currency: "USD", effective_from: today });
  const [bw, setBw] = useState({ client_id: "", rate_type: "regular", amount: "", markup_pct: "0", currency: "USD", effective_from: today });

  const submitPay = async () => {
    if (!agencyId || !pw.worker_id || !(Number(pw.amount) > 0)) return toast.error("Choose a worker and enter an hourly amount above 0");
    try {
      await addPay.mutateAsync({ agency_id: agencyId, worker_id: pw.worker_id, rate_type: pw.rate_type, amount: Number(pw.amount), currency: pw.currency, effective_from: pw.effective_from || null });
      setPw({ worker_id: "", rate_type: "regular", amount: "", currency: "USD", effective_from: today });
      toast.success("Pay rate saved");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save pay rate"); }
  };
  const submitBill = async () => {
    if (!agencyId || !bw.client_id || !(Number(bw.amount) > 0)) return toast.error("Choose a client and enter an hourly amount above 0");
    try {
      await addBill.mutateAsync({
        agency_id: agencyId, client_id: bw.client_id, rate_type: bw.rate_type,
        amount: Number(bw.amount), markup_pct: Number(bw.markup_pct || 0), currency: bw.currency, effective_from: bw.effective_from || null,
      });
      setBw({ client_id: "", rate_type: "regular", amount: "", markup_pct: "0", currency: "USD", effective_from: today });
      toast.success("Bill rate saved");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save bill rate"); }
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">Worker Pay Rates</h3>
        <div className="grid grid-cols-2 gap-2">
          <select aria-label="Worker" className="border rounded p-2 text-sm bg-background col-span-2" value={pw.worker_id} onChange={(e) => setPw({ ...pw, worker_id: e.target.value })}>
            <option value="">Choose worker…</option>
            {people?.workers.map(w => <option key={w.id} value={w.id}>{workerName(w.id)}</option>)}
          </select>
          <select aria-label="Rate type" className="border rounded p-2 text-sm bg-background" value={pw.rate_type} onChange={(e) => setPw({ ...pw, rate_type: e.target.value })}>
            {PAY_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <Input aria-label="Hourly pay" type="number" min="0" step="0.01" placeholder="Hourly pay" value={pw.amount} onChange={(e) => setPw({ ...pw, amount: e.target.value })} />
          <select aria-label="Currency" className="border rounded p-2 text-sm bg-background" value={pw.currency} onChange={(e) => setPw({ ...pw, currency: e.target.value })}>
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <Input aria-label="Starts on" type="date" value={pw.effective_from} onChange={(e) => setPw({ ...pw, effective_from: e.target.value })} />
          <Button size="sm" onClick={submitPay}>Add</Button>
        </div>
        <div className="text-xs space-y-1 max-h-64 overflow-auto">
          {pays.map((r) => (
            <div key={String(r.id)} className="flex justify-between border-b py-1">
              <span>{workerName(r.worker_id)} · {String(r.rate_type)}{r.effective_from ? ` · from ${String(r.effective_from)}` : ""}</span>
              <span>{Number(r.amount).toFixed(2)} {String(r.currency ?? "USD")}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">Client Bill Rates</h3>
        <div className="grid grid-cols-2 gap-2">
          <select aria-label="Client" className="border rounded p-2 text-sm bg-background col-span-2" value={bw.client_id} onChange={(e) => setBw({ ...bw, client_id: e.target.value })}>
            <option value="">Choose client…</option>
            {people?.clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
          <select aria-label="Rate type" className="border rounded p-2 text-sm bg-background" value={bw.rate_type} onChange={(e) => setBw({ ...bw, rate_type: e.target.value })}>
            {BILL_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <Input aria-label="Hourly bill rate" type="number" min="0" step="0.01" placeholder="Hourly bill" value={bw.amount} onChange={(e) => setBw({ ...bw, amount: e.target.value })} />
          <select aria-label="Currency" className="border rounded p-2 text-sm bg-background" value={bw.currency} onChange={(e) => setBw({ ...bw, currency: e.target.value })}>
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <Input aria-label="Markup percent" type="number" min="0" step="0.1" placeholder="Markup %" value={bw.markup_pct} onChange={(e) => setBw({ ...bw, markup_pct: e.target.value })} />
          <Input aria-label="Starts on" type="date" value={bw.effective_from} onChange={(e) => setBw({ ...bw, effective_from: e.target.value })} />
          <Button size="sm" onClick={submitBill}>Add</Button>
        </div>
        <div className="text-xs space-y-1 max-h-64 overflow-auto">
          {bills.map((r) => (
            <div key={String(r.id)} className="flex justify-between border-b py-1">
              <span>{clientName(r.client_id)} · {String(r.rate_type)} · +{Number(r.markup_pct)}%{r.effective_from ? ` · from ${String(r.effective_from)}` : ""}</span>
              <span>{Number(r.amount).toFixed(2)} {String(r.currency ?? "USD")}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 text-xs text-muted-foreground md:col-span-2">
        <Label className="text-xs font-semibold">Note</Label> Approved payroll and sent invoice line items are immutable. Rate changes only affect future payroll and invoice generation runs.
      </Card>
    </div>
  );
}
