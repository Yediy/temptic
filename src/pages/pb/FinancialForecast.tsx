import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useForecasts, useRunForecast } from "@/hooks/pb/use-pb";
import { toast } from "sonner";

export default function FinancialForecast() {
  const { agencyId } = useAuth();
  const { data: forecasts = [] } = useForecasts(agencyId ?? undefined);
  const run = useRunForecast();

  // Get latest per metric
  const latest = new Map<string, Record<string, unknown>>();
  for (const f of forecasts) if (!latest.has(String(f.metric))) latest.set(String(f.metric), f);

  return (
    <div className="space-y-4">
      <Card className="p-4 flex items-center justify-between">
        <div>
          <div className="font-semibold">Financial Forecast</div>
          <div className="text-xs text-muted-foreground">30-day projections based on last 90 days.</div>
        </div>
        <Button size="sm" onClick={async () => {
          if (!agencyId) return;
          await run.mutateAsync(agencyId);
          toast.success("Forecast refreshed");
        }}>Run forecast</Button>
      </Card>

      <div className="grid md:grid-cols-3 gap-3">
        {Array.from(latest.entries()).map(([metric, f]) => {
          const v = f.value_json as Record<string, number>;
          return (
            <Card key={metric} className="p-4">
              <div className="text-xs uppercase text-muted-foreground">{metric.replace("_", " ")}</div>
              <div className="text-lg font-semibold mt-1">
                ${Number(v.projected_next_30 ?? v.outstanding ?? v.gross_history_90 ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {String(f.horizon_start)} → {String(f.horizon_end)}
              </div>
            </Card>
          );
        })}
        {latest.size === 0 && <div className="text-sm text-muted-foreground">No forecasts yet.</div>}
      </div>
    </div>
  );
}
