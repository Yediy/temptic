import { useAuth } from "@/lib/auth";
import { useWoicLearningHistory } from "@/hooks/use-woic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";

export default function WoicLearning() {
  const { agencyId } = useAuth();
  const { data, isLoading, error } = useWoicLearningHistory(agencyId ?? undefined, 100);

  return (
    <Card>
      <CardHeader><CardTitle>Learning Signals</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <LoadingState />}
        {error && <ErrorState error={error} />}
        {!isLoading && !error && data?.length === 0 && (
          <EmptyState label="No learning signals captured yet." />
        )}
        {data?.map((s: any) => (
          <div key={s.id} className="rounded-md border p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{s.signal_type}</p>
              <Badge variant="outline">{s.source ?? "system"}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Subject: <span className="font-mono">{s.subject_entity}/{String(s.subject_id).slice(0, 8)}</span> · {new Date(s.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
