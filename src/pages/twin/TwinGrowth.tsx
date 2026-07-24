import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState, EmptyState, ErrorState } from "@/components/woic/AsyncState";
import { useGrowthPlan } from "@/hooks/use-twin";
import { useTwinCtx } from "./twin-context";

function List({ title, items }: { title: string; items: unknown }) {
  const arr = Array.isArray(items) ? items : [];
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">{title}</p>
      {arr.length === 0 ? (
        <p className="text-sm text-muted-foreground">—</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {arr.map((it: any, i) => (
            <li key={i} className="rounded border p-2">
              {typeof it === "string" ? it : (it.title ?? it.label ?? JSON.stringify(it))}
              {typeof it === "object" && it?.reason ? (
                <p className="mt-1 text-xs text-muted-foreground">{it.reason}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function TwinGrowth() {
  const { twinId } = useTwinCtx();
  const q = useGrowthPlan(twinId);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Growth Plan</CardTitle></CardHeader>
      <CardContent>
        {q.isLoading ? <LoadingState /> :
         q.error ? <ErrorState error={q.error} /> :
         !q.data ? <EmptyState label="No active growth plan yet." /> : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <p className="text-lg font-semibold">{q.data.title}</p>
            </div>
            <List title="Goals" items={q.data.goals} />
            <List title="Training" items={q.data.training_recommendations} />
            <List title="Mentors" items={q.data.mentor_recommendations} />
            <List title="Assignments" items={q.data.assignment_recommendations} />
            <List title="Projects" items={q.data.project_recommendations} />
          </div>
         )}
      </CardContent>
    </Card>
  );
}
