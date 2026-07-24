import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState, EmptyState, ErrorState } from "@/components/woic/AsyncState";
import { useCareerSimulations } from "@/hooks/use-twin";
import { useTwinCtx } from "./twin-context";

export default function TwinCareerSim() {
  const { twinId } = useTwinCtx();
  const q = useCareerSimulations(twinId);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Career Simulations</CardTitle></CardHeader>
      <CardContent>
        {q.isLoading ? <LoadingState /> :
         q.error ? <ErrorState error={q.error} /> :
         !q.data?.length ? <EmptyState label="No simulated career paths yet." /> : (
          <div className="grid gap-3 md:grid-cols-2">
            {q.data.map((s: any) => (
              <div key={s.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{s.scenario}</p>
                {s.target_role ? <p className="text-xs text-muted-foreground">→ {s.target_role}</p> : null}
                <dl className="mt-2 grid grid-cols-2 gap-1 text-xs">
                  <dt className="text-muted-foreground">Timeline</dt>
                  <dd>{s.timeline_months ?? "—"} mo</dd>
                  <dt className="text-muted-foreground">Confidence</dt>
                  <dd>{typeof s.confidence === "number" ? `${Math.round(s.confidence * 100)}%` : "—"}</dd>
                </dl>
                <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted p-2 text-[11px]">
                  {JSON.stringify({ salary: s.estimated_salary, skills: s.skill_growth, training: s.training_required, outcomes: s.outcomes }, null, 2)}
                </pre>
              </div>
            ))}
          </div>
         )}
      </CardContent>
    </Card>
  );
}
