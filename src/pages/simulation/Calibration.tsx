import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/woic/AsyncState";
import { useCalibrationLog, useSimulationHistory } from "@/hooks/simulation/use-simulation";
import { PLATFORM_DNA, SIMULATION_MODES, modeByKey, simulationError } from "@/lib/simulation/platform";

export default function Calibration() {
  const [log, setLog] = useCalibrationLog();
  const { records } = useSimulationHistory(200);
  const [mode, setMode] = useState("all");
  const [period, setPeriod] = useState("all");

  const filtered = useMemo(() => {
    const cutoff = period === "30d" ? Date.now() - 30 * 864e5 : period === "90d" ? Date.now() - 90 * 864e5 : 0;
    return log.filter((c) => (mode === "all" || c.mode === mode) && new Date(c.recordedAt).getTime() >= cutoff);
  }, [log, mode, period]);

  const avg = (fn: (c: (typeof filtered)[number]) => number) =>
    filtered.length ? filtered.reduce((a, c) => a + fn(c), 0) / filtered.length : null;

  const metrics = [
    { label: "Prediction accuracy", value: avg((c) => c.predictionAccuracy), pct: true },
    { label: "Confidence calibration", value: avg((c) => 1 - Math.abs(c.expectedConfidence - c.predictionAccuracy)), pct: true },
    { label: "Risk accuracy", value: avg((c) => c.riskAccuracy), pct: true },
    { label: "Assumption accuracy", value: avg((c) => c.assumptionAccuracy), pct: true },
    { label: "Missed dependencies", value: avg((c) => c.missedDependencies), pct: false },
    { label: "Correct secondary effects", value: avg((c) => c.secondOrderHits), pct: false },
    { label: "Simulation error", value: avg(simulationError), pct: false },
  ];

  const trend = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
    if (sorted.length < 2) return null;
    const half = Math.floor(sorted.length / 2);
    const early = sorted.slice(0, half).reduce((a, c) => a + c.predictionAccuracy, 0) / half;
    const late = sorted.slice(half).reduce((a, c) => a + c.predictionAccuracy, 0) / (sorted.length - half);
    return late - early;
  }, [filtered]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <select value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Scenario type"
          className="h-9 rounded-md border bg-background px-2 text-sm">
          <option value="all">All scenario types</option>
          {SIMULATION_MODES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Time period"
          className="h-9 rounded-md border bg-background px-2 text-sm">
          <option value="all">All time</option><option value="90d">Last 90 days</option><option value="30d">Last 30 days</option>
        </select>
        <span className="self-center text-xs text-muted-foreground">
          Model {PLATFORM_DNA.architecture_version} · {filtered.length} calibration records · {records.length} simulations stored
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label} className="bg-card/60 backdrop-blur">
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">{m.label}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {m.value == null ? "—" : m.pct ? `${(m.value * 100).toFixed(0)}%` : m.value.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        ))}
        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Model improvement</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {trend == null ? "—" : `${trend >= 0 ? "+" : ""}${(trend * 100).toFixed(0)}%`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Expected vs actual</CardTitle></CardHeader>
        <CardContent>
          {!filtered.length ? (
            <EmptyState label="No calibration records yet. Record an actual outcome from Simulation History." />
          ) : (
            <div className="overflow-auto">
              <table className="w-full min-w-[720px] text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-2 text-left">Simulation</th>
                    <th className="p-2 text-left">Mode</th>
                    <th className="p-2 text-left">Expected confidence</th>
                    <th className="p-2 text-left">Actual accuracy</th>
                    <th className="p-2 text-left">Error</th>
                    <th className="p-2 text-left">Outcome</th>
                    <th className="p-2 text-left" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-t align-top">
                      <td className="p-2">{c.simulationName}</td>
                      <td className="p-2">{modeByKey(c.mode).label}</td>
                      <td className="p-2">{(c.expectedConfidence * 100).toFixed(0)}%</td>
                      <td className="p-2">{(c.predictionAccuracy * 100).toFixed(0)}%</td>
                      <td className="p-2">
                        <Badge variant={simulationError(c) > 0.25 ? "destructive" : "secondary"} className="text-[10px]">
                          {simulationError(c).toFixed(2)}
                        </Badge>
                      </td>
                      <td className="max-w-[20rem] p-2 text-muted-foreground">{c.actualOutcome}</td>
                      <td className="p-2">
                        <Button size="sm" variant="ghost" onClick={() => setLog(log.filter((x) => x.id !== c.id))}>Remove</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
