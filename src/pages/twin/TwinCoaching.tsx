import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState, EmptyState, ErrorState } from "@/components/woic/AsyncState";
import { useTwinRecommendations } from "@/hooks/use-twin";
import { useTwinCtx } from "./twin-context";

export default function TwinCoaching() {
  const { twinId } = useTwinCtx();
  const q = useTwinRecommendations(twinId);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">AI Coaching & Opportunities</CardTitle></CardHeader>
      <CardContent>
        {q.isLoading ? <LoadingState /> :
         q.error ? <ErrorState error={q.error} /> :
         !q.data?.length ? <EmptyState label="No personalized recommendations yet." /> : (
          <div className="space-y-3">
            {q.data.map((r: any) => (
              <div key={r.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{r.kind.replaceAll("_", " ")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {typeof r.confidence === "number" ? <Badge variant="outline">{Math.round(r.confidence * 100)}%</Badge> : null}
                    <Badge>{r.status}</Badge>
                  </div>
                </div>
                {r.body ? <p className="mt-2 text-sm text-muted-foreground">{r.body}</p> : null}
                {r.reasoning ? <p className="mt-2 text-xs italic text-muted-foreground">Why: {r.reasoning}</p> : null}
              </div>
            ))}
          </div>
         )}
      </CardContent>
    </Card>
  );
}
