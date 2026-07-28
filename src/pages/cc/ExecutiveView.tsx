import { useParams } from "react-router-dom";
import { useCcAnalytics, useCommandCenter } from "@/hooks/cc/use-client-collab";
import { StatCard } from "@/components/StatCard";
import { DollarSign, TrendingUp, Users, ShieldCheck } from "lucide-react";

export default function ExecutiveView() {
  const { clientId } = useParams();
  const { data: cmd } = useCommandCenter(clientId);
  const { data: snap } = useCcAnalytics(clientId);
  const m = snap?.[0]?.metrics as Record<string, number> | undefined;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Executive View</h2>
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatCard label="Open Positions" value={cmd?.openPositions ?? 0} icon={Users} />
        <StatCard label="Placements (30d)" value={m?.placements ?? 0} icon={Users} />
        <StatCard label="Fill Rate" value={`${m?.fill_rate ?? 0}%`} icon={TrendingUp} />
        <StatCard label="Approval Rate" value={`${m?.approval_rate ?? 0}%`} icon={ShieldCheck} />
        <StatCard label="Open Invoices" value={cmd?.invoicesOpen ?? 0} icon={DollarSign} />
      </div>
      <p className="text-xs text-muted-foreground">
        Executive metrics refresh from the latest analytics snapshot. Trigger a new snapshot from the Analytics tab.
      </p>
    </div>
  );
}
