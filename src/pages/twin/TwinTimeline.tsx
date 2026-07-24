import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState, EmptyState, ErrorState } from "@/components/woic/AsyncState";
import { useTwinLearningEvents } from "@/hooks/use-twin";
import { useTwinCtx } from "./twin-context";

export default function TwinTimeline() {
  const { twinId } = useTwinCtx();
  const q = useTwinLearningEvents(twinId);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Twin Timeline</CardTitle></CardHeader>
      <CardContent>
        {q.isLoading ? <LoadingState /> :
         q.error ? <ErrorState error={q.error} /> :
         !q.data?.length ? <EmptyState label="No learning events yet." /> : (
          <ol className="relative space-y-3 border-l pl-4">
            {q.data.map((e: any) => (
              <li key={e.id}>
                <span className="absolute -left-[5px] mt-2 h-2 w-2 rounded-full bg-primary" />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium capitalize">{e.event_type.replaceAll("_", " ")}</span>
                  <span className="text-xs text-muted-foreground">{e.source}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(e.occurred_at).toLocaleString()}
                  </span>
                </div>
                {e.impact && Object.keys(e.impact).length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {Object.entries(e.impact).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
         )}
      </CardContent>
    </Card>
  );
}
