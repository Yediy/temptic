import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState, EmptyState, ErrorState } from "@/components/woic/AsyncState";
import { useAssignmentSimulations } from "@/hooks/use-twin";
import { useTwinCtx } from "./twin-context";

function score(n: number | null | undefined) {
  return typeof n === "number" ? Math.round(n) : "—";
}

export default function TwinAssignmentSim() {
  const { twinId } = useTwinCtx();
  const q = useAssignmentSimulations(twinId);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Assignment Simulations</CardTitle></CardHeader>
      <CardContent>
        {q.isLoading ? <LoadingState /> :
         q.error ? <ErrorState error={q.error} /> :
         !q.data?.length ? <EmptyState label="No assignment simulations yet." /> : (
          <div className="space-y-2 text-sm">
            {q.data.map((s: any) => (
              <div key={s.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">Success: {typeof s.success_probability === "number" ? `${Math.round(s.success_probability * 100)}%` : "—"}</span>
                  <span className="text-xs text-muted-foreground">{s.created_at ? new Date(s.created_at).toLocaleString() : ""}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs md:grid-cols-5">
                  <div><span className="text-muted-foreground">Perf</span> {score(s.performance_score)}</div>
                  <div><span className="text-muted-foreground">Attend</span> {score(s.attendance_score)}</div>
                  <div><span className="text-muted-foreground">Safety</span> {score(s.safety_score)}</div>
                  <div><span className="text-muted-foreground">Retain</span> {score(s.retention_score)}</div>
                  <div><span className="text-muted-foreground">Client Sat</span> {score(s.satisfaction_score)}</div>
                </div>
                {s.reasoning ? <p className="mt-2 text-xs text-muted-foreground">{s.reasoning}</p> : null}
              </div>
            ))}
          </div>
         )}
      </CardContent>
    </Card>
  );
}
