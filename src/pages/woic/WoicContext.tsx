import { useAuth } from "@/lib/auth";
import { useWoicContext } from "@/hooks/use-woic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";

export default function WoicContext() {
  const { agencyId } = useAuth();
  const { data, isLoading, error } = useWoicContext(agencyId ?? undefined);

  return (
    <Card>
      <CardHeader><CardTitle>Current Context Session</CardTitle></CardHeader>
      <CardContent>
        {isLoading && <LoadingState />}
        {error && <ErrorState error={error} />}
        {!isLoading && !error && !data && <EmptyState label="No active context session for this user." />}
        {data && (
          <pre className="text-xs bg-muted rounded-md p-3 overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
