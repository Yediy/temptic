import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTtoAuditEvents } from "@/hooks/tto/use-tto";

export default function AuditCenter() {
  const { data, isLoading } = useTtoAuditEvents();
  return (
    <div className="space-y-2">
      <h2 className="font-semibold">Audit Events</h2>
      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {!isLoading && data?.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">No audit events yet.</Card>}
      {(data ?? []).map((e: Record<string, unknown>) => (
        <Card key={String(e.id)} className="p-3 flex items-center justify-between text-sm">
          <div>
            <div className="font-medium">{String(e.action)}</div>
            <div className="text-xs text-muted-foreground">{new Date(String(e.occurred_at)).toLocaleString()} · {String(e.actor_kind ?? "")}</div>
          </div>
          {e.time_ticket_id ? <Badge variant="outline" className="font-mono text-[10px]">{String(e.time_ticket_id).slice(0, 8)}</Badge> : null}
        </Card>
      ))}
    </div>
  );
}
