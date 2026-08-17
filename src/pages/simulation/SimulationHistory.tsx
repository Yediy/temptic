import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";
import { ConfidenceBar, ModeBadge, ProjectionBadge, useSelectedSimId } from "@/components/simulation/SimBits";
import {
  useArchivedSimulations, useCalibrationLog, useSavedResults, useSimSettings,
  useSimulationAssistant, useSimulationHistory,
} from "@/hooks/simulation/use-simulation";
import {
  SIMULATION_MODES, isLowConfidence, modeByKey, simHorizon, simMode, simName,
  PLATFORM_DNA, type SimulationRecord,
} from "@/lib/simulation/platform";
import { useToast } from "@/hooks/use-toast";

export default function SimulationHistory() {
  const { records, isLoading, error } = useSimulationHistory(200);
  const [selectedId, setSelectedId] = useSelectedSimId();
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [archived, setArchived] = useArchivedSimulations();
  const [saved, setSaved] = useSavedResults();
  const [calibration, setCalibration] = useCalibrationLog();
  const [settings] = useSimSettings();
  const assistant = useSimulationAssistant();
  const navigate = useNavigate();
  const { toast } = useToast();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return records.filter((r) =>
      (showArchived ? archived.includes(r.id) : !archived.includes(r.id)) &&
      (mode === "all" || simMode(r) === mode) &&
      (!needle || `${simName(r)} ${r.scenario}`.toLowerCase().includes(needle)));
  }, [records, q, mode, archived, showArchived]);

  const selected = records.find((r) => r.id === selectedId) ?? null;

  if (isLoading) return <LoadingState label="Loading simulation history…" />;
  if (error) return <ErrorState error={error} />;

  const exportSim = (s: SimulationRecord) => {
    const blob = new Blob([JSON.stringify({ ...s, platform_contract: PLATFORM_DNA.platform_contract }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `simulation-${s.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const recordOutcome = (s: SimulationRecord) => {
    const actual = window.prompt("What actually happened? (recorded against this simulation)");
    if (!actual) return;
    const accuracyRaw = window.prompt("Observed prediction accuracy 0-1", "0.7");
    const accuracy = Math.max(0, Math.min(1, Number(accuracyRaw ?? 0.7) || 0));
    setCalibration([{
      id: crypto.randomUUID(),
      simulationId: s.id,
      simulationName: simName(s),
      mode: simMode(s),
      recordedAt: new Date().toISOString(),
      predictionAccuracy: accuracy,
      riskAccuracy: accuracy,
      assumptionAccuracy: accuracy,
      missedDependencies: 0,
      secondOrderHits: 0,
      expectedConfidence: s.confidence ?? 0,
      actualOutcome: actual,
    }, ...calibration].slice(0, 200));
    toast({ title: "Outcome recorded", description: "Calibration updated." });
  };

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        <div className="flex flex-wrap gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search simulations…" className="max-w-xs" />
          <select value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Mode"
            className="h-10 rounded-md border bg-background px-2 text-sm">
            <option value="all">All modes</option>
            {SIMULATION_MODES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
          <Button size="sm" variant={showArchived ? "default" : "outline"} onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? "Viewing archive" : "Archive"}
          </Button>
        </div>

        {!filtered.length ? <EmptyState label="No simulations match." /> : (
          <div className="overflow-auto rounded-md border">
            <table className="w-full min-w-[720px] text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-left">Scenario</th>
                  <th className="p-2 text-left">Mode</th>
                  <th className="p-2 text-left">Horizon</th>
                  <th className="p-2 text-left">Confidence</th>
                  <th className="p-2 text-left">Created</th>
                  <th className="p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className={`border-t ${s.id === selectedId ? "bg-primary/5" : ""}`}>
                    <td className="max-w-[16rem] p-2">
                      <button type="button" className="truncate text-left hover:underline" onClick={() => setSelectedId(s.id)}>
                        {simName(s)}
                      </button>
                    </td>
                    <td className="p-2"><ModeBadge mode={simMode(s)} /></td>
                    <td className="p-2">{simHorizon(s)}</td>
                    <td className="p-2">
                      <Badge variant={isLowConfidence(s) ? "destructive" : "secondary"} className="text-[10px]">
                        {((s.confidence ?? 0) * 100).toFixed(0)}%
                      </Badge>
                    </td>
                    <td className="p-2 text-muted-foreground">{new Date(s.created_at).toLocaleString()}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/simulation/builder?question=${encodeURIComponent(s.scenario)}`)}>Duplicate</Button>
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/simulation/timeline?sim=${s.id}`)}>Replay</Button>
                        <Button size="sm" variant="ghost" onClick={() => exportSim(s)}>Export</Button>
                        <Button size="sm" variant="ghost"
                          onClick={() => setArchived(archived.includes(s.id) ? archived.filter((x) => x !== s.id) : [...archived, s.id])}>
                          {archived.includes(s.id) ? "Restore" : "Archive"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm">Detail</CardTitle>
          {selected && <ProjectionBadge kind={simMode(selected) === "counterfactual" ? "COUNTERFACTUAL" : "PROJECTED"} />}
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {!selected ? <EmptyState label="Select a simulation." /> : (
            <>
              <p className="whitespace-pre-wrap rounded-md border bg-muted/40 p-2">{selected.scenario}</p>
              <ConfidenceBar value={selected.confidence} threshold={settings.confidenceThreshold} />
              <p className="text-muted-foreground">
                Engine {modeByKey(simMode(selected)).label} · {PLATFORM_DNA.architecture_version} · {PLATFORM_DNA.platform_contract}
              </p>
              <ul className="space-y-1">
                {selected.outcomes.map((o, i) => (
                  <li key={i} className="rounded border border-dashed border-sky-500/40 p-2">
                    <span className="font-medium">{o.horizon}</span> · p={o.probability.toFixed(2)}
                    <p className="text-muted-foreground">{o.description}</p>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-1">
                <Button size="sm" variant="outline" onClick={() => recordOutcome(selected)}>Record actual outcome</Button>
                <Button size="sm" variant="outline"
                  onClick={() => setSaved(saved.includes(selected.id) ? saved.filter((x) => x !== selected.id) : [...saved, selected.id])}>
                  {saved.includes(selected.id) ? "Unsave" : "Save"}
                </Button>
                <Button asChild size="sm" variant="ghost"><Link to={`/simulation/compare`}>Compare</Link></Button>
              </div>
              <div className="pt-1">
                <Button size="sm" variant="outline" className="w-full" disabled={assistant.pending}
                  onClick={() => assistant.ask("explain_scenario", selected)}>
                  {assistant.pending ? "Explaining…" : "Explain with WOIC"}
                </Button>
                {assistant.answer && (
                  <p className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-2">{assistant.answer}</p>
                )}
                {assistant.error && <ErrorState error={assistant.error} />}
              </div>
              {calibration.filter((c) => c.simulationId === selected.id).map((c) => (
                <p key={c.id} className="rounded border p-2 text-[11px]">
                  Calibration {new Date(c.recordedAt).toLocaleDateString()} · accuracy {(c.predictionAccuracy * 100).toFixed(0)}% — {c.actualOutcome}
                </p>
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
