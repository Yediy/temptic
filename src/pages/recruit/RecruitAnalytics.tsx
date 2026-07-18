import { useAuth } from "@/lib/auth";
import { useWoicPredictionResults } from "@/hooks/use-woic";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RecruitAnalytics() {
  const { agencyId } = useAuth();
  const preds = useWoicPredictionResults(agencyId ?? undefined, 25);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Workforce predictions (WOIC)</CardTitle></CardHeader>
        <CardContent>
          {preds.isLoading ? <LoadingState /> :
           preds.error ? <ErrorState error={preds.error} /> :
           !preds.data?.length ? <EmptyState label="No prediction results yet." /> : (
            <div className="space-y-2 text-sm">
              {preds.data.map((r: { id: string; model_key?: string; score?: number; created_at?: string }) => (
                <div key={r.id} className="flex justify-between border-b py-1">
                  <span>{r.model_key ?? r.id.slice(0, 8)}</span>
                  <span className="text-muted-foreground">score {r.score ?? "—"}</span>
                </div>
              ))}
            </div>
           )}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Time-to-fill, placement rate, recruiter performance, and revenue forecast are computed inside WOIC prediction models. Register new models in the WOIC Admin console.
      </p>
    </div>
  );
}
