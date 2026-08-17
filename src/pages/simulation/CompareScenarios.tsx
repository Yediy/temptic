import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";
import { ConfidenceBar, ProjectionBadge, SimulationSelect } from "@/components/simulation/SimBits";
import { useSimulationAssistant, useSimulationHistory, useSimSettings } from "@/hooks/simulation/use-simulation";
import { useOrgSnapshot } from "@/hooks/woic/use-cognitive";
import { useAuth } from "@/lib/auth";
import { modeByKey, simHorizon, simMode, simName, type SimulationRecord } from "@/lib/simulation/platform";

const DEFAULT_CRITERIA = ["Projected outcomes", "Expected benefits", "Expected costs", "Risks", "Confidence", "Uncertainty", "Constraint violations", "Dependencies", "Second-order effects", "Projected events"];

export default function CompareScenarios() {
  const { agencyId } = useAuth();
  const { records, isLoading, error } = useSimulationHistory(200);
  const [settings] = useSimSettings();
  const snapshot = useOrgSnapshot(agencyId ?? undefined);
  const assistant = useSimulationAssistant();
  const [ids, setIds] = useState<Array<string | undefined>>([undefined, undefined, undefined]);
  const [criteria, setCriteria] = useState(DEFAULT_CRITERIA.join(", "));

  const selected = useMemo(
    () => ids.map((id) => records.find((r) => r.id === id) ?? null),
    [ids, records],
  );

  if (isLoading) return <LoadingState label="Loading simulations…" />;
  if (error) return <ErrorState error={error} />;
  if (!records.length) return <EmptyState label="Run at least one simulation before comparing." />;

  const chosen = selected.filter(Boolean) as SimulationRecord[];

  return (
    <div className="space-y-3">
      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Scenarios to compare</CardTitle></CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-3">
          {ids.map((id, i) => (
            <div key={i} className="space-y-1">
              <p className="text-xs text-muted-foreground">Scenario {String.fromCharCode(65 + i)}</p>
              <SimulationSelect records={records} value={id}
                onChange={(v) => setIds(ids.map((x, xi) => (xi === i ? v : x)))} />
            </div>
          ))}
          <div className="md:col-span-3">
            <p className="text-xs text-muted-foreground">Comparison criteria</p>
            <Input value={criteria} onChange={(e) => setCriteria(e.target.value)} className="text-xs" />
          </div>
        </CardContent>
      </Card>

      <div className="overflow-auto rounded-md border">
        <table className="w-full min-w-[900px] text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-2 text-left">Criterion</th>
              <th className="p-2 text-left">
                <span className="flex items-center gap-2">Current state <ProjectionBadge kind="ACTUAL" /></span>
              </th>
              {chosen.map((s) => (
                <th key={s.id} className="p-2 text-left">
                  <span className="flex items-center gap-2">{simName(s)} <ProjectionBadge kind="PROJECTED" /></span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Row label="Mode" actual="production" cells={chosen.map((s) => modeByKey(simMode(s)).label)} />
            <Row label="Horizon" actual="now" cells={chosen.map((s) => simHorizon(s))} />
            <Row
              label="Projected outcomes"
              actual={String((snapshot.data as Record<string, unknown> | undefined)?.summary ?? "Unchanged trajectory")}
              cells={chosen.map((s) => s.outcomes.map((o) => `${o.horizon}: ${o.description}`).join(" · ") || "—")}
            />
            <Row label="Probability spread" actual="—"
              cells={chosen.map((s) => s.outcomes.map((o) => o.probability.toFixed(2)).join(" / ") || "—")} />
            <Row label="Expected benefits" actual="—"
              cells={chosen.map((s) => s.recommendations.map((r) => r.impact).filter(Boolean).join("; ") || "—")} />
            <Row label="Expected costs / risks" actual="—"
              cells={chosen.map((s) => s.outcomes.flatMap((o) => Object.entries(o.metrics).map(([k, v]) => `${k}: ${String(v)}`)).join(" · ") || "—")} />
            <Row label="Constraints" actual="—"
              cells={chosen.map((s) => (Array.isArray(s.inputs.constraints) ? (s.inputs.constraints as string[]).join("; ") : "—") || "—")} />
            <Row label="Assumptions" actual="—" cells={chosen.map((s) => s.assumptions.join("; ") || "—")} />
            <Row label="Second-order effects" actual="—"
              cells={chosen.map((s) => s.recommendations.map((r) => r.rationale).join(" · ") || "—")} />
            <tr className="border-t">
              <td className="p-2 font-medium">Confidence</td>
              <td className="p-2 text-muted-foreground">n/a</td>
              {chosen.map((s) => (
                <td key={s.id} className="p-2"><ConfidenceBar value={s.confidence} threshold={settings.confidenceThreshold} /></td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm">WOIC recommendation</CardTitle>
          <Badge variant="outline" className="text-[10px]">advisory only</Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button size="sm" variant="outline" disabled={!chosen.length || assistant.pending}
            onClick={() => assistant.ask("compare_outcomes", { criteria, scenarios: chosen })}>
            {assistant.pending ? "Comparing…" : "Compare with WOIC"}
          </Button>
          {assistant.error && <ErrorState error={assistant.error} />}
          {assistant.answer && (
            <p className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-2 text-xs">{assistant.answer}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, actual, cells }: { label: string; actual: string; cells: string[] }) {
  return (
    <tr className="border-t align-top">
      <td className="p-2 font-medium">{label}</td>
      <td className="p-2 text-muted-foreground">{actual}</td>
      {cells.map((c, i) => <td key={i} className="p-2">{c}</td>)}
    </tr>
  );
}
