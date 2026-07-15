import { useAuth } from "@/lib/auth";
import { useWoicDecisions } from "@/hooks/use-woic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";

export default function WoicDecisions() {
  const { agencyId } = useAuth();
  const { data, isLoading, error } = useWoicDecisions(agencyId ?? undefined, 50);

  return (
    <Card>
      <CardHeader><CardTitle>Recent Decisions</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <LoadingState />}
        {error && <ErrorState error={error} />}
        {!isLoading && !error && data?.length === 0 && <EmptyState label="No decisions logged." />}
        {data?.map((d: any) => (
          <div key={d.id} className="rounded-md border p-3 space-y-1">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">{d.decision_type}</p>
              <Badge variant="outline">{d.outcome ?? "pending"}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Subject: <span className="font-mono">{d.subject_entity}/{String(d.subject_id).slice(0, 8)}</span>
              {typeof d.confidence === "number" && <> · Confidence {(d.confidence * 100).toFixed(0)}%</>}
            </p>
            {d.rationale && <p className="text-xs">{d.rationale}</p>}
            <p className="text-[10px] text-muted-foreground">{new Date(d.created_at).toLocaleString()}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
