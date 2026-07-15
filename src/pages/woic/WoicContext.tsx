import { useAuth } from "@/lib/auth";
import { useWoicContext } from "@/hooks/use-woic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WoicContext() {
  const { agencyId } = useAuth();
  const { data, isLoading } = useWoicContext(agencyId ?? undefined);

  return (
    <Card>
      <CardHeader><CardTitle>Current Context Session</CardTitle></CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && !data && <p className="text-sm text-muted-foreground">No active context session for this user.</p>}
        {data && (
          <pre className="text-xs bg-muted rounded-md p-3 overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
