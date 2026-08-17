import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/woic/AsyncState";
import { cancelRun, useSimulationRuns } from "@/hooks/simulation/use-simulation";
import { modeByKey, type SimulationRecord } from "@/lib/simulation/platform";
import type { RunStatus } from "@/hooks/simulation/use-simulation";
import { Link } from "react-router-dom";

const badgeFor: Record<RunStatus, "default" | "secondary" | "destructive" | "outline"> = {
  queued: "outline", running: "default", succeeded: "secondary", failed: "destructive", cancelled: "outline",
};

export default function LiveRuns() {
  const runs = useSimulationRuns();

  return (
    <Card className="bg-card/60 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Live runs (this session)</CardTitle>
      </CardHeader>
      <CardContent>
        {!runs.length ? <EmptyState label="No simulation runs yet. Runs stream here while the engine works." /> : (
          <ul className="space-y-2">
            {runs.map((r) => (
              <li key={r.id} className="rounded-md border p-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{r.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{modeByKey(r.mode).label}</Badge>
                    <Badge variant="outline" className="text-[10px]">{r.horizon}</Badge>
                    <Badge variant={badgeFor[r.status]} className="text-[10px] capitalize">{r.status}</Badge>
                  </div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full ${r.status === "failed" ? "bg-destructive" : "bg-primary"}`} style={{ width: `${r.progress}%` }} />
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <span>
                    started {new Date(r.startedAt).toLocaleTimeString()}
                    {r.finishedAt ? ` · ${((r.finishedAt - r.startedAt) / 1000).toFixed(1)}s` : ""}
                  </span>
                  <span className="flex gap-2">
                    {r.status === "running" && (
                      <Button size="sm" variant="ghost" onClick={() => cancelRun(r.id)}>Cancel</Button>
                    )}
                    {r.resultId && (
                      <Button asChild size="sm" variant="ghost">
                        <Link to={`/simulation/history?sim=${r.resultId}`}>View result</Link>
                      </Button>
                    )}
                  </span>
                </div>
                {r.error && <p className="mt-1 text-[11px] text-destructive">{r.error}</p>}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export type { SimulationRecord };
