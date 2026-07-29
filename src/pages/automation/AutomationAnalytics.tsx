import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAutomationAnalytics, useAutomationRuns } from "@/hooks/automation/use-automation";
import { format, startOfHour, subHours } from "date-fns";
import { useMemo } from "react";

export default function AutomationAnalytics() {
  const { totals } = useAutomationAnalytics();
  const runs = useAutomationRuns(500);

  const hourly = useMemo(() => {
    const buckets = new Map<string, { ok: number; fail: number }>();
    for (let i = 23; i >= 0; i--) {
      const key = format(startOfHour(subHours(new Date(), i)), "HH:00");
      buckets.set(key, { ok: 0, fail: 0 });
    }
    for (const r of runs.data ?? []) {
      const key = format(startOfHour(new Date(r.ran_at)), "HH:00");
      const b = buckets.get(key);
      if (b) {
        if (r.status === "succeeded") b.ok += 1;
        else b.fail += 1;
      }
    }
    return Array.from(buckets.entries()).map(([hour, v]) => ({ hour, ...v }));
  }, [runs.data]);

  const max = Math.max(1, ...hourly.map((h) => h.ok + h.fail));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <Kpi label="Rules" value={totals.totalRules} />
        <Kpi label="Success rate" value={`${totals.successRate}%`} tone="ok" />
        <Kpi label="Avg runtime" value={`${totals.avgMs}ms`} />
        <Kpi label="Dead letter" value={totals.deadLetter} tone={totals.deadLetter > 0 ? "warn" : undefined} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Runs — last 24h</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-end gap-1">
            {hourly.map((h) => (
              <div key={h.hour} className="flex flex-1 flex-col items-center gap-1">
                <div className="relative flex w-full flex-1 flex-col justify-end">
                  <div className="w-full bg-red-500" style={{ height: `${(h.fail / max) * 100}%` }} />
                  <div className="w-full bg-emerald-500" style={{ height: `${(h.ok / max) * 100}%` }} />
                </div>
                <span className="text-[9px] text-muted-foreground">{h.hour}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 bg-emerald-500" /> Succeeded</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 bg-red-500" /> Failed</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string | number; tone?: "ok" | "warn" }) {
  const color = tone === "ok" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-5">
        <div className={`text-2xl font-semibold ${color}`}>{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
