import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState, EmptyState, ErrorState } from "@/components/woic/AsyncState";
import { useTwinPredictions } from "@/hooks/use-twin";
import { useTwinCtx } from "./twin-context";

export default function TwinPredictions() {
  const { twinId } = useTwinCtx();
  const q = useTwinPredictions(twinId);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Predictions</CardTitle></CardHeader>
      <CardContent>
        {q.isLoading ? <LoadingState /> :
         q.error ? <ErrorState error={q.error} /> :
         !q.data?.length ? <EmptyState label="No predictions yet — run Recompute Twin." /> : (
          <div className="space-y-2">
            {q.data.map((p: any) => (
              <div key={p.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium capitalize">{p.kind.replace(/_/g, " ")}</span>
                    {p.horizon ? <Badge variant="outline">{p.horizon}</Badge> : null}
                  </div>
                  {typeof p.confidence === "number" ? (
                    <span className="text-xs text-muted-foreground">confidence {Math.round(p.confidence * 100)}%</span>
                  ) : null}
                </div>
                <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-xs">{JSON.stringify(p.value ?? {}, null, 2)}</pre>
                {p.reasoning ? <p className="mt-2 text-xs text-muted-foreground">{p.reasoning}</p> : null}
              </div>
            ))}
          </div>
         )}
      </CardContent>
    </Card>
  );
}
