import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { useTtoBillingBatches, useTtoPrepareBilling } from "@/hooks/tto/use-tto";
import { toast } from "sonner";
import { BatchList } from "@/components/tto/BatchList";

export default function BillingPrep() {
  const { agencyId } = useAuth();
  const { data: batches } = useTtoBillingBatches();
  const prep = useTtoPrepareBilling();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const run = async () => {
    if (!agencyId || !start || !end) { toast.error("Set start and end dates"); return; }
    try { const r = await prep.mutateAsync({ agency_id: agencyId, period_start: start, period_end: end });
      toast.success(`Prepared batch with ${r.batch?.ticket_ids?.length ?? 0} tickets`); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Prepare Billing Batch</h2>
        <div className="grid grid-cols-2 gap-2 max-w-md">
          <div><Label>Period start</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div><Label>Period end</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
        </div>
        <Button onClick={run} disabled={prep.isPending}>Prepare</Button>
      </Card>
      <div className="space-y-2">
        <h3 className="font-medium text-sm">Weekly Batches</h3>
        <p className="text-xs text-muted-foreground">Approved tickets roll into each week's batch automatically. Generate an export to lock the batch and download the file.</p>
        <BatchList kind="billing" batches={(batches ?? []) as never} />
      </div>
    </div>
  );
}
