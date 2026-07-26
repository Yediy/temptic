import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { usePayrollRuns, useComplianceScanRun, usePayrollExceptions } from "@/hooks/pb/use-pb";
import { toast } from "sonner";

const RULES = [
  { label: "Federal / state tax rules", status: "active" },
  { label: "Overtime (>40h weekly, >60h flag)", status: "active" },
  { label: "Minimum wage", status: "active" },
  { label: "State-specific requirements", status: "partial" },
  { label: "Client contract clauses", status: "manual" },
];

export default function PbCompliance() {
  const { agencyId } = useAuth();
  const { data: runs = [] } = usePayrollRuns(agencyId ?? undefined);
  const [runId, setRunId] = useState<string | null>(null);
  const { data: exs = [] } = usePayrollExceptions(runId ?? undefined);
  const scan = useComplianceScanRun();

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">Compliance Rules</h3>
        {RULES.map((r) => (
          <div key={r.label} className="flex justify-between text-sm border-b py-1">
            <span>{r.label}</span>
            <Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge>
          </div>
        ))}
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">Scan Payroll Run</h3>
        <select className="border rounded p-2 text-sm w-full" value={runId ?? ""} onChange={(e) => setRunId(e.target.value || null)}>
          <option value="">Select a run…</option>
          {runs.map((r) => <option key={String(r.id)} value={String(r.id)}>{String(r.name)}</option>)}
        </select>
        <Button size="sm" disabled={!runId} onClick={async () => {
          if (!runId) return;
          const r = await scan.mutateAsync(runId);
          toast.success(`Scan complete · ${r.findings ?? 0} findings`);
        }}>Run compliance scan</Button>
        <div className="text-xs space-y-1 max-h-64 overflow-auto">
          {exs.map((e) => (
            <div key={String(e.id)} className="flex justify-between border-b py-1">
              <Badge variant={e.severity === "critical" || e.severity === "error" ? "destructive" : "secondary"}>{String(e.severity)}</Badge>
              <span className="flex-1 ml-2">{String(e.message)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
