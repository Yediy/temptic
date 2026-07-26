import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { usePayRates, useBillRates, useUpsertPayRate, useUpsertBillRate } from "@/hooks/pb/use-pb";
import { toast } from "sonner";

const PAY_TYPES = ["regular", "overtime", "double_time", "holiday", "shift_diff", "bonus", "per_diem", "mileage"];
const BILL_TYPES = ["regular", "overtime", "double_time", "holiday", "shift_diff", "travel", "expense"];

export default function RateBook() {
  const { agencyId } = useAuth();
  const { data: pays = [] } = usePayRates(agencyId ?? undefined);
  const { data: bills = [] } = useBillRates(agencyId ?? undefined);
  const addPay = useUpsertPayRate();
  const addBill = useUpsertBillRate();
  const [pw, setPw] = useState({ worker_id: "", rate_type: "regular", amount: "" });
  const [bw, setBw] = useState({ client_id: "", rate_type: "regular", amount: "", markup_pct: "0" });

  const submitPay = async () => {
    if (!agencyId || !pw.worker_id || !pw.amount) return toast.error("worker_id and amount required");
    await addPay.mutateAsync({ agency_id: agencyId, worker_id: pw.worker_id, rate_type: pw.rate_type, amount: Number(pw.amount) });
    setPw({ worker_id: "", rate_type: "regular", amount: "" });
    toast.success("Pay rate saved");
  };
  const submitBill = async () => {
    if (!agencyId || !bw.client_id || !bw.amount) return toast.error("client_id and amount required");
    await addBill.mutateAsync({
      agency_id: agencyId, client_id: bw.client_id, rate_type: bw.rate_type,
      amount: Number(bw.amount), markup_pct: Number(bw.markup_pct),
    });
    setBw({ client_id: "", rate_type: "regular", amount: "", markup_pct: "0" });
    toast.success("Bill rate saved");
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">Worker Pay Rates</h3>
        <div className="grid grid-cols-4 gap-2">
          <Input placeholder="worker_id" value={pw.worker_id} onChange={(e) => setPw({ ...pw, worker_id: e.target.value })} />
          <select className="border rounded p-2 text-sm" value={pw.rate_type} onChange={(e) => setPw({ ...pw, rate_type: e.target.value })}>
            {PAY_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <Input type="number" placeholder="Amount" value={pw.amount} onChange={(e) => setPw({ ...pw, amount: e.target.value })} />
          <Button size="sm" onClick={submitPay}>Add</Button>
        </div>
        <div className="text-xs space-y-1 max-h-64 overflow-auto">
          {pays.map((r) => (
            <div key={String(r.id)} className="flex justify-between border-b py-1">
              <span>W:{String(r.worker_id).slice(0, 8)} · {String(r.rate_type)}</span>
              <span>${Number(r.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">Client Bill Rates</h3>
        <div className="grid grid-cols-5 gap-2">
          <Input placeholder="client_id" value={bw.client_id} onChange={(e) => setBw({ ...bw, client_id: e.target.value })} />
          <select className="border rounded p-2 text-sm" value={bw.rate_type} onChange={(e) => setBw({ ...bw, rate_type: e.target.value })}>
            {BILL_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <Input type="number" placeholder="Amount" value={bw.amount} onChange={(e) => setBw({ ...bw, amount: e.target.value })} />
          <Input type="number" placeholder="Markup %" value={bw.markup_pct} onChange={(e) => setBw({ ...bw, markup_pct: e.target.value })} />
          <Button size="sm" onClick={submitBill}>Add</Button>
        </div>
        <div className="text-xs space-y-1 max-h-64 overflow-auto">
          {bills.map((r) => (
            <div key={String(r.id)} className="flex justify-between border-b py-1">
              <span>C:{String(r.client_id).slice(0, 8)} · {String(r.rate_type)} · +{Number(r.markup_pct)}%</span>
              <span>${Number(r.amount).toFixed(2)}</span>
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
