import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";
import { OptimizationSelect, useSelectedOptId } from "@/components/optimization/OptBits";
import { useOptimizationAssistant, useOptimizationHistory } from "@/hooks/optimization/use-optimization";
import { RESOURCE_LABELS, recommendedStrategy, type ResourceKind } from "@/lib/optimization/platform";

export default function ResourcePlanner() {
  const { records, isLoading, error } = useOptimizationHistory();
  const [optId, setOptId] = useSelectedOptId();
  const assistant = useOptimizationAssistant();

  if (isLoading) return <LoadingState label="Loading resource plan…" />;
  if (error) return <ErrorState error={error} />;

  const record = records.find((r) => r.id === optId) ?? records[0] ?? null;
  const strategy = record ? recommendedStrategy(record) : null;
  const resources = strategy?.resources ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <OptimizationSelect records={records} value={optId} onChange={setOptId} />
        <Button size="sm" variant="outline" disabled={!resources.length || assistant.pending}
          onClick={() => assistant.ask("resource_plan", { strategy: strategy?.name, resources })}>
          {assistant.pending ? "Consulting WOIC…" : "Explain the resource plan"}
        </Button>
      </div>

      {!strategy ? <EmptyState label="No recommended strategy available yet." /> : (
        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Allocation for “{strategy.name}”</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {resources.length ? resources.map((r, i) => {
              const pct = r.capacity > 0 ? (r.allocated / r.capacity) * 100 : 0;
              const over = pct > 100;
              const idle = pct < 40;
              return (
                <div key={i} className="rounded border p-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {RESOURCE_LABELS[r.kind as ResourceKind] ?? r.kind}
                    </Badge>
                    <span className="flex-1 truncate font-medium">{r.name}</span>
                    <span className="text-muted-foreground">
                      {r.allocated} / {r.capacity} {r.unit} · {r.timeframe || "unscoped"}
                    </span>
                    {over && <Badge variant="destructive" className="text-[10px]">over-committed</Badge>}
                    {!over && idle && <Badge variant="secondary" className="text-[10px]">idle capacity</Badge>}
                  </div>
                  <div className="mt-1 h-2 w-full rounded bg-muted">
                    <div className={`h-2 rounded ${over ? "bg-destructive" : idle ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                </div>
              );
            }) : <EmptyState label="The engine returned no resource allocation for this strategy." />}
          </CardContent>
        </Card>
      )}

      {assistant.error && <ErrorState error={assistant.error} />}
      {assistant.answer && (
        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-2"><CardTitle className="text-sm">WOIC resource analysis</CardTitle></CardHeader>
          <CardContent><p className="max-h-72 overflow-auto whitespace-pre-wrap text-xs">{assistant.answer}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
