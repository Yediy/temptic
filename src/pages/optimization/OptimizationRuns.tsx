import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/woic/AsyncState";
import { cancelOptimizationRun, useDecisionHandoff, useOptimizationRuns } from "@/hooks/optimization/use-optimization";

const tone: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  running: "default", queued: "outline", succeeded: "secondary", failed: "destructive", cancelled: "outline",
};

export default function OptimizationRuns() {
  const runs = useOptimizationRuns();
  const { queue } = useDecisionHandoff();

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Optimization runs ({runs.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs">
          {runs.length ? runs.map((r) => (
            <div key={r.id} className="rounded border p-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex-1 truncate font-medium">{r.name}</span>
                <Badge variant={tone[r.status] ?? "outline"} className="text-[10px]">{r.status}</Badge>
                {r.status === "running" && (
                  <Button size="sm" variant="ghost" onClick={() => cancelOptimizationRun(r.id)}>Cancel</Button>
                )}
                {r.resultId && (
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/optimization/strategies?opt=${r.resultId}`}>Open</Link>
                  </Button>
                )}
              </div>
              <div className="mt-1 h-1.5 w-full rounded bg-muted">
                <div className="h-1.5 rounded bg-primary transition-all" style={{ width: `${r.progress}%` }} />
              </div>
              <p className="mt-1 text-muted-foreground">
                {r.mode} · {r.horizon} · started {new Date(r.startedAt).toLocaleString()}
                {r.strategies ? ` · ${r.strategies} strategies` : ""}
              </p>
              {r.error && <p className="text-destructive">{r.error}</p>}
            </div>
          )) : <EmptyState label="No optimization runs in this session." />}
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Decision handoffs ({queue.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs">
          {queue.length ? queue.map((h) => (
            <div key={h.id} className="rounded border p-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex-1 truncate font-medium">{h.strategyName}</span>
                <Badge variant={h.status === "failed" ? "destructive" : "secondary"} className="text-[10px]">
                  {h.status === "failed" ? "failed" : "awaiting approval"}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {h.optimizationName} · sent {new Date(h.submittedAt).toLocaleString()} · approval: {h.approvalRoles.join(", ")}
              </p>
              <p className="text-muted-foreground">{h.reason}</p>
              <p className="text-muted-foreground">{h.constitution}{h.policy ? ` · ${h.policy}` : ""}</p>
              {h.detail && <p className="text-destructive">{h.detail}</p>}
            </div>
          )) : <EmptyState label="No strategies have been routed to Decision Intelligence." />}
        </CardContent>
      </Card>
    </div>
  );
}
