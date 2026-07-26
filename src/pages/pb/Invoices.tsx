import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import {
  useInvoices, useInvoiceItems, useInvoicePayments,
  useGenerateInvoices, useUpdateInvoiceStatus, useRecordPayment,
} from "@/hooks/pb/use-pb";
import { toast } from "sonner";

const STATUSES = ["draft", "review", "approved", "sent", "paid", "overdue", "void"];

export default function Invoices() {
  const { agencyId } = useAuth();
  const [status, setStatus] = useState<string>("");
  const { data: invoices = [] } = useInvoices(agencyId ?? undefined, status || undefined);
  const gen = useGenerateInvoices();
  const upd = useUpdateInvoiceStatus();
  const pay = useRecordPayment();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: items = [] } = useInvoiceItems(selectedId ?? undefined);
  const { data: pays = [] } = useInvoicePayments(selectedId ?? undefined);
  const [payAmount, setPayAmount] = useState("");
  const [method, setMethod] = useState("ach");

  const run = async () => {
    if (!agencyId || !start || !end) return toast.error("Set start and end dates");
    try {
      const r = await gen.mutateAsync({ agency_id: agencyId, period_start: start, period_end: end });
      toast.success(`Generated ${r.count ?? 0} invoices`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="space-y-3">
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Generate Invoices</h3>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Period start</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div><Label>Period end</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          </div>
          <Button onClick={run} disabled={gen.isPending}>Generate</Button>
        </Card>

        <div className="flex gap-1 flex-wrap">
          <Button size="sm" variant={status === "" ? "default" : "outline"} onClick={() => setStatus("")}>All</Button>
          {STATUSES.map((s) => (
            <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>{s}</Button>
          ))}
        </div>

        <div className="space-y-2 max-h-[60vh] overflow-auto">
          {invoices.map((i) => (
            <Card key={String(i.id)}
              className={`p-3 cursor-pointer ${selectedId === i.id ? "border-primary" : ""}`}
              onClick={() => setSelectedId(String(i.id))}>
              <div className="flex justify-between">
                <div>
                  <div className="font-medium text-sm">{String(i.number)}</div>
                  <div className="text-xs text-muted-foreground">{String(i.period_start)} – {String(i.period_end)}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">${Number(i.total).toFixed(2)}</div>
                  <Badge variant={i.status === "overdue" ? "destructive" : "secondary"}>{String(i.status)}</Badge>
                </div>
              </div>
            </Card>
          ))}
          {invoices.length === 0 && <div className="text-sm text-muted-foreground">No invoices.</div>}
        </div>
      </div>

      <div className="space-y-3">
        {selectedId ? (
          <>
            <Card className="p-4 space-y-2">
              <div className="flex gap-2 flex-wrap">
                {["review", "approved", "sent", "void"].map((s) => (
                  <Button key={s} size="sm" variant="outline" onClick={() => upd.mutate({ id: selectedId, status: s })}>
                    → {s}
                  </Button>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <div className="font-semibold mb-2 text-sm">Line Items ({items.length})</div>
              <div className="text-xs space-y-1 max-h-48 overflow-auto">
                {items.map((i) => (
                  <div key={String(i.id)} className="flex justify-between border-b py-1">
                    <span>{String(i.description)} · {Number(i.hours)}h @ ${Number(i.bill_rate)}</span>
                    <span className="font-medium">${Number(i.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4 space-y-2">
              <div className="font-semibold text-sm">Record Payment</div>
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Amount" type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
                <select className="border rounded p-2 text-sm" value={method} onChange={(e) => setMethod(e.target.value)}>
                  {["ach", "check", "wire", "stripe", "plaid", "manual"].map((m) => <option key={m}>{m}</option>)}
                </select>
                <Button size="sm" onClick={async () => {
                  const amt = Number(payAmount);
                  if (!amt) return toast.error("Enter amount");
                  await pay.mutateAsync({ invoice_id: selectedId, amount: amt, method });
                  setPayAmount("");
                  toast.success("Payment recorded");
                }}>Record</Button>
              </div>
              <div className="text-xs space-y-1 max-h-32 overflow-auto">
                {pays.map((p) => (
                  <div key={String(p.id)} className="flex justify-between">
                    <span>{String(p.method)} · {String(p.received_at).slice(0, 10)}</span>
                    <span>${Number(p.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </>
        ) : (
          <Card className="p-4 text-sm text-muted-foreground">Select an invoice.</Card>
        )}
      </div>
    </div>
  );
}
