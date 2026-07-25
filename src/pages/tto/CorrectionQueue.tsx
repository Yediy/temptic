import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTtoCorrections } from "@/hooks/tto/use-tto";

export default function CorrectionQueue() {
  const { data, isLoading } = useTtoCorrections();
  return (
    <div className="space-y-3">
      <h2 className="font-semibold">Corrections</h2>
      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {!isLoading && data?.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">No corrections submitted.</Card>}
      {data?.map((c: Record<string, unknown>) => (
        <Card key={String(c.id)} className="p-4 space-y-1">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Ticket: <span className="font-mono text-xs">{String(c.time_ticket_id).slice(0, 8)}</span></div>
            <Badge variant="outline">{String(c.status)}</Badge>
          </div>
          <div className="text-sm">{String(c.reason)}</div>
          <div className="text-xs text-muted-foreground">{new Date(String(c.created_at)).toLocaleString()}</div>
        </Card>
      ))}
    </div>
  );
}
