import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";
import { SimulationSelect, useSelectedSimId } from "@/components/simulation/SimBits";
import { useAuth } from "@/lib/auth";
import { useOrganizationalRisks } from "@/hooks/graph/use-graph";
import { useSimulationAssistant, useSimulationHistory } from "@/hooks/simulation/use-simulation";
import { RISK_CATEGORIES, simName } from "@/lib/simulation/platform";

interface RiskRow {
  label: string;
  category: string;
  severity: number;
  probability: number;
  confidence: number;
  source: "simulation" | "graph";
  detail: string;
}

const categorize = (text: string): string => {
  const t = text.toLowerCase();
  const hit = RISK_CATEGORIES.find((c) => t.includes(c.toLowerCase().split(" ")[0]));
  return hit ?? "Operational";
};

export default function RiskExplorer() {
  const { agencyId } = useAuth();
  const { records, isLoading, error } = useSimulationHistory(200);
  const [simId, setSimId] = useSelectedSimId();
  const graphRisks = useOrganizationalRisks(agencyId ?? undefined);
  const assistant = useSimulationAssistant();
  const [category, setCategory] = useState("all");
  const [minSeverity, setMinSeverity] = useState(0);

  const sim = records.find((r) => r.id === simId) ?? null;

  const rows = useMemo<RiskRow[]>(() => {
    const out: RiskRow[] = [];
    if (sim) {
      sim.outcomes.forEach((o) => {
        out.push({
          label: o.description || "Projected outcome",
          category: categorize(o.description),
          severity: Math.min(1, 1 - (sim.confidence ?? 0.5) + o.probability / 2),
          probability: o.probability,
          confidence: sim.confidence ?? 0,
          source: "simulation",
          detail: `${o.horizon} · ${Object.entries(o.metrics).map(([k, v]) => `${k}: ${String(v)}`).join(", ")}`,
        });
      });
      sim.recommendations.forEach((r) => {
        out.push({
          label: r.action,
          category: categorize(`${r.action} ${r.impact}`),
          severity: 0.4,
          probability: 0.5,
          confidence: sim.confidence ?? 0,
          source: "simulation",
          detail: `Mitigation — ${r.rationale}`,
        });
      });
    }
    const graphRows = Array.isArray(graphRisks.data) ? [] : (graphRisks.data?.risks ?? []);
    graphRows.forEach((raw) => {

      const r = raw as Record<string, unknown>;
      const label = String(r.label ?? r.name ?? "Organizational risk");
      out.push({
        label,
        category: categorize(`${label} ${String(r.category ?? "")}`),
        severity: Number(r.risk ?? r.severity ?? 0.5),
        probability: Number(r.probability ?? 0.5),
        confidence: Number(r.confidence ?? 0.6),
        source: "graph",
        detail: String(r.reason ?? r.detail ?? "Detected by Platform Graph Intelligence"),
      });
    });
    return out;
  }, [sim, graphRisks.data]);

  const filtered = rows.filter((r) => (category === "all" || r.category === category) && r.severity >= minSeverity);

  if (isLoading) return <LoadingState label="Loading risk surface…" />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="grid gap-3 lg:grid-cols-4">
      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Filters</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <SimulationSelect records={records} value={simId} onChange={setSimId} />
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Risk category"
            className="h-9 w-full rounded-md border bg-background px-2 text-sm">
            <option value="all">All categories</option>
            {RISK_CATEGORIES.map((c) => <option key={c} value={c}>{c} risk</option>)}
          </select>
          <label className="block text-xs text-muted-foreground">
            Minimum severity ({minSeverity.toFixed(2)})
            <input type="range" min={0} max={1} step={0.05} value={minSeverity}
              onChange={(e) => setMinSeverity(Number(e.target.value))} className="w-full" />
          </label>
          <Button size="sm" variant="outline" className="w-full" disabled={assistant.pending || !filtered.length}
            onClick={() => assistant.ask("suggest_mitigation", { simulation: sim ? simName(sim) : null, risks: filtered.slice(0, 30) })}>
            {assistant.pending ? "Consulting WOIC…" : "Suggest mitigations"}
          </Button>
          {assistant.answer && (
            <p className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-2 text-[11px]">{assistant.answer}</p>
          )}
          {assistant.error && <ErrorState error={assistant.error} />}
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur lg:col-span-3">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Risk surface ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          {graphRisks.isLoading && <LoadingState label="Loading organizational risks…" />}
          {!filtered.length ? <EmptyState label="No risks match the current filters." /> : (
            <div className="overflow-auto">
              <table className="w-full min-w-[720px] text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-2 text-left">Risk</th>
                    <th className="p-2 text-left">Category</th>
                    <th className="p-2 text-left">Severity</th>
                    <th className="p-2 text-left">Probability</th>
                    <th className="p-2 text-left">Confidence</th>
                    <th className="p-2 text-left">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={i} className="border-t align-top">
                      <td className="max-w-[22rem] p-2">
                        <p className="font-medium">{r.label}</p>
                        <p className="text-muted-foreground">{r.detail}</p>
                      </td>
                      <td className="p-2"><Badge variant="outline" className="text-[10px]">{r.category}</Badge></td>
                      <td className="p-2">
                        <Badge variant={r.severity > 0.6 ? "destructive" : "secondary"} className="text-[10px]">{r.severity.toFixed(2)}</Badge>
                      </td>
                      <td className="p-2">{r.probability.toFixed(2)}</td>
                      <td className="p-2">{(r.confidence * 100).toFixed(0)}%</td>
                      <td className="p-2 capitalize text-muted-foreground">{r.source}</td>
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
