import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDeadLetter, useResolveDeadLetter } from "@/hooks/automation/use-automation";
import { formatDistanceToNow } from "date-fns";
import { Skull } from "lucide-react";

export default function DeadLetterQueue() {
  const q = useDeadLetter();
  const resolve = useResolveDeadLetter();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Skull className="h-4 w-4 text-red-600" /> Dead letter queue
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {(q.data ?? []).map((r) => (
          <div key={r.id} className="rounded border p-3 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="destructive">{r.source_kind}</Badge>
                <span className="text-xs text-muted-foreground">
                  {r.attempts} attempts · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                </span>
              </div>
              <Button size="sm" variant="outline" onClick={() => resolve.mutate(r.id)} disabled={resolve.isPending}>
                Mark resolved
              </Button>
            </div>
            {r.error && <div className="mt-2 rounded bg-red-50 p-2 text-xs text-red-800">{r.error}</div>}
            <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted p-2 text-xs">
              {JSON.stringify(r.payload, null, 2)}
            </pre>
          </div>
        ))}
        {q.data && q.data.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nothing in the dead letter queue. Failed automations that exceed retries will appear here.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
