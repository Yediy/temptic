import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useMarginAnalysis, useRunForecast } from "@/hooks/pb/use-pb";
import { toast } from "sonner";

export default function MarginIntelligence() {
  const { agencyId } = useAuth();
  const { data: margins = [] } = useMarginAnalysis(agencyId ?? undefined);
  const run = useRunForecast();

  return (
    <div className="space-y-4">
      <Card className="p-4 flex items-center justify-between">
        <div>
          <div className="font-semibold">Margin Intelligence</div>
          <div className="text-xs text-muted-foreground">WOIC-backed profitability snapshots per client, worker, assignment and branch.</div>
        </div>
        <Button size="sm" onClick={async () => {
          if (!agencyId) return;
          await run.mutateAsync(agencyId);
          toast.success("Recomputed margin + forecast");
        }}>Recompute</Button>
      </Card>

      <div className="grid md:grid-cols-3 gap-3">
        {margins.map((m) => (
          <Card key={String(m.id)} className="p-4 space-y-1">
            <div className="text-xs uppercase text-muted-foreground">{String(m.scope)}</div>
            <div className="font-semibold">${Number(m.gross_margin).toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">
              Rev ${Number(m.revenue).toLocaleString()} · Cost ${Number(m.cost).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              {String(m.period_start)} → {String(m.period_end)}
            </div>
          </Card>
        ))}
        {margins.length === 0 && <div className="text-sm text-muted-foreground">No margin analysis yet — click Recompute.</div>}
      </div>
    </div>
  );
}
