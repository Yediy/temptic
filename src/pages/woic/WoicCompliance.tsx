import { useAuth } from "@/lib/auth";
import { useWoicComplianceAlerts } from "@/hooks/use-woic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const severityVariant = (s: string): "default" | "destructive" | "secondary" | "outline" => {
  if (s === "critical" || s === "high") return "destructive";
  if (s === "medium") return "default";
  return "secondary";
};

export default function WoicCompliance() {
  const { agencyId } = useAuth();
  const { data, isLoading } = useWoicComplianceAlerts(agencyId ?? undefined, 100);

  return (
    <Card>
      <CardHeader><CardTitle>Compliance Alerts</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {data?.length === 0 && <p className="text-sm text-muted-foreground">No open compliance events.</p>}
        {data?.map((e: any) => (
          <div key={e.id} className="rounded-md border p-3 space-y-1">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">{e.event_type}</p>
              <div className="flex gap-2">
                <Badge variant={severityVariant(e.severity)}>{e.severity}</Badge>
                <Badge variant="outline">{e.status}</Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Subject: <span className="font-mono">{e.subject_entity}/{String(e.subject_id).slice(0, 8)}</span>
              {e.next_action_at && <> · Next action {new Date(e.next_action_at).toLocaleDateString()}</>}
            </p>
            {e.notes && <p className="text-xs">{e.notes}</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
