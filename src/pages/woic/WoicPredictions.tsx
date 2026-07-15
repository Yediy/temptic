import { useAuth } from "@/lib/auth";
import { useWoicPredictionModels, useWoicPredictionResults } from "@/hooks/use-woic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";

export default function WoicPredictions() {
  const { agencyId } = useAuth();
  const models = useWoicPredictionModels(agencyId ?? undefined);
  const results = useWoicPredictionResults(agencyId ?? undefined);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Registered Models</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {models.isLoading && <LoadingState />}
          {models.error && <ErrorState error={models.error} />}
          {!models.isLoading && !models.error && models.data?.length === 0 && (
            <EmptyState label="No models registered." />
          )}
          {models.data?.map((m: any) => (
            <div key={m.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">{m.name}</p>
                <Badge variant={m.enabled ? "default" : "secondary"}>{m.enabled ? "enabled" : "disabled"}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{m.model_type} · v{m.version}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Predictions</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {results.isLoading && <LoadingState />}
          {results.error && <ErrorState error={results.error} />}
          {!results.isLoading && !results.error && results.data?.length === 0 && (
            <EmptyState label="No predictions yet." />
          )}
          {results.data?.map((r: any) => (
            <div key={r.id} className="rounded-md border p-3">
              <p className="text-sm font-medium">{r.subject_entity}/{String(r.subject_id).slice(0, 8)}</p>
              <p className="text-xs text-muted-foreground">
                Score {typeof r.score === "number" ? r.score.toFixed(3) : "—"} · {new Date(r.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
