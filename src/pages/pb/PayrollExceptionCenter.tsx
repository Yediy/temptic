import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { usePayrollRuns, usePayrollExceptions } from "@/hooks/pb/use-pb";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export default function PayrollExceptionCenter() {
  const { agencyId } = useAuth();
  const { data: runs = [] } = usePayrollRuns(agencyId ?? undefined);
  const [runId, setRunId] = useState<string | null>(null);
  const { data: exs = [], refetch } = usePayrollExceptions(runId ?? undefined);

  const resolve = async (id: string) => {
    const { error } = await supabase.from("pb_payroll_exceptions" as Any)
      .update({ resolved_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Resolved");
    refetch();
  };

  const grouped: Record<string, typeof exs> = {};
  for (const e of exs) {
    const c = String(e.category);
    (grouped[c] ||= []).push(e);
  }

  return (
    <div className="grid md:grid-cols-[240px_1fr] gap-4">
      <Card className="p-3 max-h-[70vh] overflow-auto">
        <div className="text-xs font-semibold mb-2">Payroll Runs</div>
        {runs.map((r) => (
          <button key={String(r.id)} onClick={() => setRunId(String(r.id))}
            className={`w-full text-left text-xs p-2 rounded ${runId === r.id ? "bg-primary/10" : "hover:bg-muted"}`}>
            {String(r.name)}
          </button>
        ))}
      </Card>
      <div className="space-y-3">
        {runId ? (
          Object.entries(grouped).length === 0 ? (
            <Card className="p-4 text-sm text-muted-foreground">No exceptions.</Card>
          ) : (
            Object.entries(grouped).map(([cat, list]) => (
              <Card key={cat} className="p-4">
                <div className="font-semibold text-sm mb-2 capitalize">{cat.replace(/_/g, " ")} ({list.length})</div>
                <div className="text-xs space-y-2">
                  {list.map((e) => (
                    <div key={String(e.id)} className="flex justify-between items-start border-b py-1">
                      <div className="flex-1">
                        <Badge variant={e.severity === "critical" || e.severity === "error" ? "destructive" : "secondary"}>{String(e.severity)}</Badge>
                        <span className="ml-2">{String(e.message)}</span>
                      </div>
                      {!e.resolved_at && <Button size="sm" variant="outline" onClick={() => resolve(String(e.id))}>Resolve</Button>}
                      {e.resolved_at && <Badge variant="default" className="ml-2">resolved</Badge>}
                    </div>
                  ))}
                </div>
              </Card>
            ))
          )
        ) : (
          <Card className="p-4 text-sm text-muted-foreground">Select a payroll run.</Card>
        )}
      </div>
    </div>
  );
}
