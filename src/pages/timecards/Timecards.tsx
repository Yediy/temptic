import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Clock, Plus } from "lucide-react";
import { toast } from "sonner";
import { usePayProfiles, useBillProfiles, useCreatePayProfile, useCreateBillProfile } from "@/hooks/use-pay-profiles";

export default function Timecards() {
  const { data: pay, isLoading: payLoading } = usePayProfiles();
  const { data: bill, isLoading: billLoading } = useBillProfiles();
  const createPay = useCreatePayProfile();
  const createBill = useCreateBillProfile();
  const [payOpen, setPayOpen] = useState(false);
  const [billOpen, setBillOpen] = useState(false);
  const [payForm, setPayForm] = useState({ name: "", base_rate: "", ot_multiplier: "1.5", burden_percent: "0" });
  const [billForm, setBillForm] = useState({ name: "", markup_percent: "0", flat_bill_rate: "" });

  const submitPay = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPay.mutateAsync({
        name: payForm.name.trim(),
        base_rate: payForm.base_rate ? Number(payForm.base_rate) : undefined,
        ot_multiplier: Number(payForm.ot_multiplier) || 1.5,
        burden_percent: Number(payForm.burden_percent) || 0,
      });
      toast.success("Pay profile created");
      setPayOpen(false);
      setPayForm({ name: "", base_rate: "", ot_multiplier: "1.5", burden_percent: "0" });
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };
  const submitBill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBill.mutateAsync({
        name: billForm.name.trim(),
        markup_percent: Number(billForm.markup_percent) || 0,
        flat_bill_rate: billForm.flat_bill_rate ? Number(billForm.flat_bill_rate) : undefined,
      });
      toast.success("Bill profile created");
      setBillOpen(false);
      setBillForm({ name: "", markup_percent: "0", flat_bill_rate: "" });
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Clock className="h-5 w-5" /> Timecards</h1>
        <p className="text-sm text-muted-foreground">Pay and bill profiles used when calculating multi-rate timecards. Existing weekly ticket hours continue to flow through unchanged.</p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Pay profiles</h2>
          <Dialog open={payOpen} onOpenChange={setPayOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />New</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Pay Profile</DialogTitle></DialogHeader>
              <form onSubmit={submitPay} className="space-y-3">
                <div><Label>Name *</Label><Input required value={payForm.name} onChange={e => setPayForm({ ...payForm, name: e.target.value })} /></div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label>Base rate</Label><Input type="number" step="0.01" value={payForm.base_rate} onChange={e => setPayForm({ ...payForm, base_rate: e.target.value })} /></div>
                  <div><Label>OT ×</Label><Input type="number" step="0.01" value={payForm.ot_multiplier} onChange={e => setPayForm({ ...payForm, ot_multiplier: e.target.value })} /></div>
                  <div><Label>Burden %</Label><Input type="number" step="0.01" value={payForm.burden_percent} onChange={e => setPayForm({ ...payForm, burden_percent: e.target.value })} /></div>
                </div>
                <DialogFooter><Button type="button" variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button><Button type="submit" disabled={createPay.isPending}>Create</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        {payLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!payLoading && pay?.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">No pay profiles yet.</Card>}
        <div className="grid gap-2">
          {pay?.map(p => (
            <Card key={p.id} className="p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">Base ${p.base_rate ?? "—"} · OT ×{p.ot_multiplier} · Burden {p.burden_percent}%</div>
              </div>
              {p.active && <Badge variant="secondary">Active</Badge>}
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Bill profiles</h2>
          <Dialog open={billOpen} onOpenChange={setBillOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />New</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Bill Profile</DialogTitle></DialogHeader>
              <form onSubmit={submitBill} className="space-y-3">
                <div><Label>Name *</Label><Input required value={billForm.name} onChange={e => setBillForm({ ...billForm, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Markup %</Label><Input type="number" step="0.01" value={billForm.markup_percent} onChange={e => setBillForm({ ...billForm, markup_percent: e.target.value })} /></div>
                  <div><Label>Flat bill rate</Label><Input type="number" step="0.01" value={billForm.flat_bill_rate} onChange={e => setBillForm({ ...billForm, flat_bill_rate: e.target.value })} /></div>
                </div>
                <DialogFooter><Button type="button" variant="outline" onClick={() => setBillOpen(false)}>Cancel</Button><Button type="submit" disabled={createBill.isPending}>Create</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        {billLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!billLoading && bill?.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">No bill profiles yet.</Card>}
        <div className="grid gap-2">
          {bill?.map(b => (
            <Card key={b.id} className="p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{b.name}</div>
                <div className="text-xs text-muted-foreground">Markup {b.markup_percent}% · Flat ${b.flat_bill_rate ?? "—"}</div>
              </div>
              {b.active && <Badge variant="secondary">Active</Badge>}
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
