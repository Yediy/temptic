import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import {
  usePayrollRuns, usePayrollItems, usePayrollExceptions,
  useGeneratePayroll, useApprovePayrollRun, useMarkPayrollPaid, useComplianceScanRun,
} from "@/hooks/pb/use-pb";
import { toast } from "sonner";

export default function PayrollRuns() {
  const { agencyId } = useAuth();
  const { data: runs = [] } = usePayrollRuns(agencyId ?? undefined);
  const generate = useGeneratePayroll();
  const approve = useApprovePayrollRun();
  const markPaid = useMarkPayrollPaid();
  const scan = useComplianceScanRun();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: items = [] } = usePayrollItems(selectedId ?? undefined);
  const { data: exceptions = [] } = usePayrollExceptions(selectedId ?? undefined);

  const run = async () => {
    if (!agencyId || !start || !end) return toast.error("Set start and end dates");
    try {
      const r = await generate.mutateAsync({ agency_id: agencyId, period_start: start, period_end: end });
      toast.success(`Generated run · ${r.totals?.ticket_count ?? 0} tickets · ${r.exceptions ?? 0} exceptions`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="space-y-3">
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Generate Payroll</h3>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Period start</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div><Label>Period end</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          </div>
          <Button onClick={run} disabled={generate.isPending}>Run payroll</Button>
        </Card>

        <div className="space-y-2">
          {runs.map((r) => (
            <Card
              key={String(r.id)}
              className={`p-3 cursor-pointer ${selectedId === r.id ? "border-primary" : ""}`}
              onClick={() => setSelectedId(String(r.id))}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{String(r.name)}</div>
                  <div className="text-xs text-muted-foreground">{String(r.period_start)} – {String(r.period_end)}</div>
                </div>
                <Badge variant={r.status === "exception" ? "destructive" : "secondary"}>{String(r.status)}</Badge>
              </div>
              <div className="text-xs mt-1 text-muted-foreground">
                Gross ${Number((r.totals as Record<string, unknown>)?.gross_pay ?? 0).toFixed(2)} · Net ${Number((r.totals as Record<string, unknown>)?.net_pay ?? 0).toFixed(2)}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {selectedId ? (
          <>
            <Card className="p-4 space-y-2">
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={() => approve.mutate(selectedId)} disabled={approve.isPending}>Approve</Button>
                <Button size="sm" variant="secondary" onClick={() => markPaid.mutate(selectedId)}>Mark paid</Button>
                <Button size="sm" variant="outline" onClick={async () => {
                  const r = await scan.mutateAsync(selectedId);
                  toast.success(`Scan complete · ${r.findings ?? 0} findings`);
                }}>Compliance scan</Button>
              </div>
            </Card>

            <Card className="p-4">
              <div className="font-semibold mb-2 text-sm">Items ({items.length})</div>
              <div className="text-xs space-y-1 max-h-64 overflow-auto">
                {items.map((i) => (
                  <div key={String(i.id)} className="flex justify-between border-b py-1">
                    <span>W:{String(i.worker_id).slice(0, 8)} · Reg {Number(i.regular_hours)}h OT {Number(i.ot_hours)}h</span>
                    <span className="font-medium">${Number(i.net_pay).toFixed(2)}</span>
                  </div>
                ))}
                {items.length === 0 && <div className="text-muted-foreground">No items.</div>}
              </div>
            </Card>

            <Card className="p-4">
              <div className="font-semibold mb-2 text-sm">Exceptions ({exceptions.length})</div>
              <div className="text-xs space-y-1 max-h-48 overflow-auto">
                {exceptions.map((e) => (
                  <div key={String(e.id)} className="flex justify-between">
                    <Badge variant={e.severity === "critical" || e.severity === "error" ? "destructive" : "secondary"}>{String(e.severity)}</Badge>
                    <span className="ml-2 flex-1">{String(e.message)}</span>
                  </div>
                ))}
                {exceptions.length === 0 && <div className="text-muted-foreground">Clean.</div>}
              </div>
            </Card>
          </>
        ) : (
          <Card className="p-4 text-sm text-muted-foreground">Select a run to inspect items and exceptions.</Card>
        )}
      </div>
    </div>
  );
}
