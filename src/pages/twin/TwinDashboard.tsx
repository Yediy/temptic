import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/woic/AsyncState";
import { useTwinCtx } from "./twin-context";

function Metric({ label, value, hint }: { label: string; value: number | null | undefined; hint?: string }) {
  const pct = typeof value === "number" ? Math.max(0, Math.min(100, value)) : 0;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-semibold">{typeof value === "number" ? Math.round(value) : "—"}</div>
        <Progress value={pct} />
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export default function TwinDashboard() {
  const { twin } = useTwinCtx();
  if (!twin) {
    return (
      <Card>
        <CardContent className="py-8">
          <EmptyState label="This worker doesn't have a twin yet. Click Recompute Twin to build the initial model." />
        </CardContent>
      </Card>
    );
  }
  const risks = Object.entries(twin.risk_indicators ?? {});
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
        <Metric label="Career Health" value={twin.career_health} />
        <Metric label="Performance Trend" value={typeof twin.learning_progress === "number" ? twin.learning_progress : null} hint="Rolling average" />
        <Metric label="Learning Progress" value={twin.learning_progress} />
        <Metric label="Growth Score" value={twin.growth_score} />
        <Metric label="Future Potential" value={twin.future_potential} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Risk Indicators</CardTitle></CardHeader>
          <CardContent>
            {risks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active risks detected.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {risks.map(([k, v]) => (
                  <li key={k} className="flex justify-between border-b py-1">
                    <span className="capitalize">{k.replaceAll("_", " ")}</span>
                    <span className="text-muted-foreground">{String(v)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Career Forecast</CardTitle></CardHeader>
          <CardContent>
            <pre className="max-h-64 overflow-auto rounded bg-muted p-3 text-xs">
              {JSON.stringify(twin.career_forecast ?? {}, null, 2)}
            </pre>
            <p className="mt-2 text-xs text-muted-foreground">
              Model {twin.model_version ?? "v0"} · last learned {twin.last_learned_at ? new Date(twin.last_learned_at).toLocaleString() : "—"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
