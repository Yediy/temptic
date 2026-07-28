import { useParams } from "react-router-dom";
import { useCcAnalytics, useGenerateAnalytics } from "@/hooks/cc/use-client-collab";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { BarChart3, Briefcase, Users, ClipboardCheck } from "lucide-react";

export default function ClientAnalytics() {
  const { clientId } = useParams();
  const { data } = useCcAnalytics(clientId);
  const gen = useGenerateAnalytics();
  const latest = data?.[0]?.metrics as Record<string, number> | undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Analytics</h2>
        <Button size="sm" onClick={() => clientId && gen.mutate({ client_id: clientId, period_days: 30 })} disabled={gen.isPending}>
          {gen.isPending ? "Refreshing…" : "Refresh snapshot"}
        </Button>
      </div>
      {latest ? (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <StatCard label="Open Orders" value={latest.open_orders ?? 0} icon={Briefcase} />
          <StatCard label="Open Positions" value={latest.open_positions ?? 0} icon={Briefcase} />
          <StatCard label="Placements" value={latest.placements ?? 0} icon={Users} />
          <StatCard label="Fill Rate" value={`${latest.fill_rate ?? 0}%`} icon={BarChart3} />
          <StatCard label="Tickets" value={latest.tickets_total ?? 0} icon={ClipboardCheck} />
          <StatCard label="Approved" value={latest.tickets_approved ?? 0} icon={ClipboardCheck} />
          <StatCard label="Approval Rate" value={`${latest.approval_rate ?? 0}%`} icon={BarChart3} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No analytics snapshot yet — click Refresh.</p>
      )}
    </div>
  );
}
