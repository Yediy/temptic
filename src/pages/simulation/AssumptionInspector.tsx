import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";
import { ConfidenceBar, ProjectionBadge, SimulationSelect, useSelectedSimId } from "@/components/simulation/SimBits";
import {
  useRunSimulation, useSimSettings, useSimulationAssistant, useSimulationHistory,
} from "@/hooks/simulation/use-simulation";
import {
  emptyScenario, simHorizon, simMode, simName,
  type ScenarioAssumption, type SimulationRecord, type TimeHorizon,
} from "@/lib/simulation/platform";
import { useToast } from "@/hooks/use-toast";

export default function AssumptionInspector() {
  const { records, isLoading, error } = useSimulationHistory(200);
  const [simId, setSimId] = useSelectedSimId();
  const [settings] = useSimSettings();
  const [rows, setRows] = useState<ScenarioAssumption[]>([]);
  const [rerun, setRerun] = useState<SimulationRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const assistant = useSimulationAssistant();
  const { run } = useRunSimulation();
  const { toast } = useToast();

  const sim = records.find((r) => r.id === simId) ?? null;

  useEffect(() => {
    if (!sim) { setRows([]); return; }
    const declared = Array.isArray(sim.inputs.assumptions) ? (sim.inputs.assumptions as ScenarioAssumption[]) : [];
    const engine = sim.assumptions.map<ScenarioAssumption>((s) => ({
      statement: s, source: "simulation engine", confidence: sim.confidence ?? 0.5, editable: true, impact: "medium",
    }));
    setRows([...declared, ...engine]);
    setRerun(null);
  }, [sim]);

  if (isLoading) return <LoadingState label="Loading assumptions…" />;
  if (error) return <ErrorState error={error} />;

  const patch = (i: number, p: Partial<ScenarioAssumption>) =>
    setRows(rows.map((r, ri) => (ri === i ? { ...r, ...p } : r)));

  const rerunWithAssumptions = async () => {
    if (!sim) return;
    setBusy(true);
    try {
      const record = await run({
        ...emptyScenario(),
        name: `${simName(sim)} — revised assumptions`,
        question: sim.scenario,
        mode: simMode(sim),
        horizon: (simHorizon(sim) as TimeHorizon) || "90d",
        confidence_threshold: settings.confidenceThreshold,
        assumptions: rows,
        origin: "manual",
      });
      setRerun(record);
      toast({ title: "Re-run complete", description: "Compare the revised projection below." });
    } catch (e) {
      toast({ title: "Re-run failed", description: e instanceof Error ? e.message : "Engine unavailable.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <Card className="bg-card/60 backdrop-blur lg:col-span-2">
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm">Assumptions</CardTitle>
          <SimulationSelect records={records} value={simId} onChange={setSimId} />
        </CardHeader>
        <CardContent className="space-y-2">
          {!sim ? <EmptyState label="Select a simulation to inspect its assumptions." /> :
            !rows.length ? <EmptyState label="This simulation declared no assumptions." /> : (
            <div className="space-y-2">
              {rows.map((a, i) => (
                <div key={i} className="rounded-md border p-2">
                  <Input value={a.statement} disabled={!a.editable}
                    onChange={(e) => patch(i, { statement: e.target.value })} className="text-xs" />
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                    <Badge variant="outline" className="text-[10px]">source: {a.source}</Badge>
                    <label className="flex items-center gap-1">
                      impact
                      <select value={a.impact} aria-label="Impact level"
                        onChange={(e) => patch(i, { impact: e.target.value as ScenarioAssumption["impact"] })}
                        className="h-7 rounded border bg-background px-1">
                        <option value="low">low</option><option value="medium">medium</option><option value="high">high</option>
                      </select>
                    </label>
                    <label className="flex flex-1 items-center gap-2">
                      confidence {(a.confidence ?? 0).toFixed(2)}
                      <input type="range" min={0} max={1} step={0.05} value={a.confidence}
                        onChange={(e) => patch(i, { confidence: Number(e.target.value) })} className="flex-1" />
                    </label>
                    {a.confidence < 0.4 && <Badge variant="destructive" className="text-[10px]">low confidence</Badge>}
                    {a.impact === "high" && <Badge variant="secondary" className="text-[10px]">high influence</Badge>}
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={busy} onClick={rerunWithAssumptions}>
                  {busy ? "Re-running…" : "Re-run with modified assumptions"}
                </Button>
                <Button size="sm" variant="outline" disabled={assistant.pending}
                  onClick={() => assistant.ask("weak_assumptions", { simulation: sim, assumptions: rows })}>
                  {assistant.pending ? "Analysing…" : "Highlight weak assumptions"}
                </Button>
              </div>
              {assistant.error && <ErrorState error={assistant.error} />}
              {assistant.answer && (
                <p className="max-h-56 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-2 text-xs">{assistant.answer}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm">Uncertainty</CardTitle>
          {sim && <ProjectionBadge kind="PROJECTED" />}
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {!sim ? <EmptyState label="No simulation selected." /> : (
            <>
              <ConfidenceBar value={sim.confidence} threshold={settings.confidenceThreshold} />
              <p className="text-muted-foreground">
                Confidence range {(Math.max(0, (sim.confidence ?? 0) - 0.15) * 100).toFixed(0)}%–
                {(Math.min(1, (sim.confidence ?? 0) + 0.15) * 100).toFixed(0)}% as reported by the engine.
              </p>
              <ul className="space-y-1">
                <li>Data gaps: {rows.filter((r) => r.confidence < 0.4).length} low-confidence assumptions</li>
                <li>Missing dependencies: {sim.outcomes.length ? "traced via Impact Map" : "not traced"}</li>
                <li>Unsupported variables: {Object.keys((sim.inputs.variables as Record<string, unknown>) ?? {}).length === 0 ? "none declared" : "declared"}</li>
                <li>Model limitations: probabilistic branches only — outcomes are not guarantees</li>
              </ul>
              <Button size="sm" variant="outline" className="w-full" disabled={assistant.pending}
                onClick={() => assistant.ask("confidence_gaps", sim)}>
                Why is confidence low?
              </Button>
              {rerun && (
                <div className="rounded-md border border-dashed border-sky-500/40 p-2">
                  <p className="font-medium">Revised projection</p>
                  <ConfidenceBar value={rerun.confidence} threshold={settings.confidenceThreshold} />
                  <ul className="mt-1 space-y-1 text-[11px] text-muted-foreground">
                    {rerun.outcomes.map((o, i) => <li key={i}>{o.horizon}: {o.description}</li>)}
                  </ul>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
