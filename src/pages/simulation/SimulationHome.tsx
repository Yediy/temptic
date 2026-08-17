import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";
import { ConfidenceBar, ModeBadge } from "@/components/simulation/SimBits";
import {
  useCalibrationLog, useSavedScenarios, useSimSettings, useSimulationAssistant,
  useSimulationHistory, useSimulationRuns,
} from "@/hooks/simulation/use-simulation";
import { isLowConfidence, simMode, simName, SCENARIO_TEMPLATES } from "@/lib/simulation/platform";

export default function SimulationHome() {
  const { records, isLoading, error } = useSimulationHistory(60);
  const runs = useSimulationRuns();
  const [savedScenarios] = useSavedScenarios();
  const [calibration] = useCalibrationLog();
  const [settings] = useSimSettings();
  const assistant = useSimulationAssistant();

  if (isLoading) return <LoadingState label="Loading simulation workspace…" />;
  if (error) return <ErrorState error={error} />;

  const active = runs.filter((r) => r.status === "running" || r.status === "queued");
  const highRisk = records.filter(isLowConfidence).slice(0, 6);
  const accuracy = calibration.length
    ? calibration.reduce((a, c) => a + c.predictionAccuracy, 0) / calibration.length
    : null;
  const calibrationDrift = calibration.length
    ? calibration.reduce((a, c) => a + Math.abs(c.expectedConfidence - c.predictionAccuracy), 0) / calibration.length
    : null;
  const recommended = SCENARIO_TEMPLATES.filter((t) => t.key !== "custom").slice(0, 5);

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <Card className="bg-card/60 backdrop-blur lg:col-span-2">
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm">Recent simulations</CardTitle>
          <Button asChild size="sm" variant="outline"><Link to="/simulation/history">All history</Link></Button>
        </CardHeader>
        <CardContent>
          {!records.length ? <EmptyState label="No simulations yet. Start in the Scenario Builder." /> : (
            <ul className="space-y-2">
              {records.slice(0, 8).map((s) => (
                <li key={s.id} className="rounded-md border p-2">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/simulation/history?sim=${s.id}`} className="truncate text-sm font-medium hover:underline">
                      {simName(s)}
                    </Link>
                    <ModeBadge mode={simMode(s)} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.scenario}</p>
                  <div className="mt-2"><ConfidenceBar value={s.confidence} threshold={settings.confidenceThreshold} /></div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Active simulations</CardTitle></CardHeader>
          <CardContent>
            {!active.length ? <EmptyState label="Nothing running." /> : (
              <ul className="space-y-2 text-sm">
                {active.map((r) => (
                  <li key={r.id}>
                    <div className="flex justify-between gap-2"><span className="truncate">{r.name}</span><span className="text-xs text-muted-foreground">{r.progress}%</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${r.progress}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Button asChild size="sm" variant="outline" className="mt-2 w-full"><Link to="/simulation/runs">Live runs</Link></Button>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Simulation health</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row label="Stored simulations" value={String(records.length)} />
            <Row label="Runs this session" value={String(runs.length)} />
            <Row label="Failed runs" value={String(runs.filter((r) => r.status === "failed").length)} />
            <Row label="Prediction accuracy" value={accuracy == null ? "—" : `${(accuracy * 100).toFixed(0)}%`} />
            <Row label="Calibration drift" value={calibrationDrift == null ? "—" : calibrationDrift.toFixed(2)} />
            <Row label="Low-confidence results" value={String(records.filter(isLowConfidence).length)} />
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">High-risk scenarios</CardTitle></CardHeader>
        <CardContent>
          {!highRisk.length ? <EmptyState label="No low-confidence results." /> : (
            <ul className="space-y-1 text-sm">
              {highRisk.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 border-b py-1">
                  <Link to={`/simulation/risk?sim=${s.id}`} className="truncate hover:underline">{simName(s)}</Link>
                  <Badge variant="destructive" className="text-[10px]">{((s.confidence ?? 0) * 100).toFixed(0)}%</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Saved scenarios & recommendations</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {savedScenarios.length > 0 && (
            <ul className="space-y-1">
              {savedScenarios.slice(0, 4).map((s) => (
                <li key={s.id} className="truncate border-b py-1 text-xs">{s.name || s.question}</li>
              ))}
            </ul>
          )}
          <p className="text-xs font-medium text-muted-foreground">Recommended simulations</p>
          <ul className="space-y-1">
            {recommended.map((t) => (
              <li key={t.key}>
                <Link to={`/simulation/builder?template=${t.key}`} className="text-xs hover:underline">{t.label}</Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">WOIC suggestions</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            disabled={assistant.pending}
            onClick={() => assistant.ask("recommend_scenarios", { recent: records.slice(0, 10).map((r) => ({ name: simName(r), scenario: r.scenario, confidence: r.confidence })) })}
          >
            {assistant.pending ? "Consulting WOIC…" : "Suggest what to simulate next"}
          </Button>
          {assistant.error && <ErrorState error={assistant.error} />}
          {assistant.answer && (
            <p className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-2 text-xs">{assistant.answer}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 border-b py-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
