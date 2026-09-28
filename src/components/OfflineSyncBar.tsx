import { useOfflinePunches } from "@/hooks/use-offline-punches";
import { discardQueued } from "@/lib/offline/punch-queue";
import { Button } from "@/components/ui/button";
import { CloudOff, RefreshCw, AlertTriangle } from "lucide-react";

export function OfflineSyncBar() {
  const { online, pending, failed, syncNow } = useOfflinePunches();
  if (online && !pending.length && !failed.length) return null;

  return (
    <div className="border-b bg-muted/60 text-sm">
      <div className="mx-auto max-w-4xl px-4 py-2 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {online ? <RefreshCw className="h-4 w-4 text-primary" /> : <CloudOff className="h-4 w-4 text-muted-foreground" />}
            <span>
              {online ? "Online" : "Offline — punches are saved on this device"}
              {pending.length > 0 && ` · ${pending.length} waiting to sync`}
            </span>
          </div>
          {online && pending.length > 0 && <Button size="sm" variant="outline" onClick={() => syncNow()}>Sync now</Button>}
        </div>
        {failed.map((f) => (
          <div key={f.client_event_id} className="flex items-center justify-between gap-2 text-destructive">
            <span className="flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" />
              {f.kind.replace("_", " ")} at {new Date(f.occurred_at).toLocaleTimeString()} was rejected: {f.last_error}
            </span>
            <Button size="sm" variant="ghost" onClick={() => discardQueued(f.client_event_id)}>Dismiss</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
