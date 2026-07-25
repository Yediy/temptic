import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { useTtoLiveLabor } from "@/hooks/tto/use-tto";

export default function LiveLaborDashboard() {
  const { agencyId } = useAuth();
  const { data, isLoading } = useTtoLiveLabor(agencyId ?? undefined);

  const cells = [
    { label: "Active Workers", value: data?.active_workers ?? 0 },
    { label: "Hours Today", value: (data?.total_hours_today ?? 0).toFixed(1) },
    { label: "Overtime Hours", value: (data?.overtime_hours ?? 0).toFixed(1) },
    { label: "Late Arrivals", value: data?.late_arrivals ?? 0 },
    { label: "Approval Queue", value: data?.approval_queue ?? 0 },
  ];

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground">{isLoading ? "Loading…" : "Auto-refreshing every 30s"}</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cells.map((c) => (
          <Card key={c.label} className="p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</div>
            <div className="text-3xl font-bold mt-1">{c.value}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
