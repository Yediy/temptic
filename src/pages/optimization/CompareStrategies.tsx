import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";
import { ConfidenceBar, OptimizationSelect, StrategyStatusBadge, useSelectedOptId } from "@/components/optimization/OptBits";
import { useOptimizationAssistant, useOptimizationHistory } from "@/hooks/optimization/use-optimization";
import { COMPARISON_METRICS, objectiveAchievement } from "@/lib/optimization/platform";

export default function CompareStrategies() {
  const { records, isLoading, error } = useOptimizationHistory();
  const [optId, setOptId] = useSelectedOptId();
  const assistant = useOptimizationAssistant();
  const [picked, setPicked] = useState<string[]>([]);

  if (isLoading) return <LoadingState label="Loading strategies…" />;
  if (error) return <ErrorState error={error} />;

  const record = records.find((r) => r.id === optId) ?? records[0] ?? null;
  const strategies = record?.strategies ?? [];
  const selected = strategies.filter((s) => (picked.length ? picked.includes(s.id) : true)).slice(0, 4);

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 4 ? p : [...p, id]));

  const best = (key: string, better: "low" | "high") => {
    const values = selected.map((s) => s.metrics[key]).filter((v) => Number.isFinite(v));
    if (!values.length) return null;
    return better === "low" ? Math.min(...values) : Math.max(...values);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <OptimizationSelect records={records} value={optId} onChange={(id) => { setOptId(id); setPicked([]); }} />
        <Button size="sm" variant="outline" disabled={!selected.length || assistant.pending}
          onClick={() => assistant.ask("explain_tradeoffs", selected)}>
          {assistant.pending ? "Consulting WOIC…" : "Explain the tradeoffs"}
        </Button>
        <Button size="sm" variant="outline" disabled={!selected.length || assistant.pending}
          onClick={() => assistant.ask("sacrifice_analysis", selected)}>
          What is sacrificed?
        </Button>
      </div>

      {!record ? <EmptyState label="No optimizations to compare yet." /> : (
        <>
          <Card className="bg-card/60 backdrop-blur">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Choose up to four strategies</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-1">
              {strategies.map((s) => (
                <button key={s.id} type="button" onClick={() => toggle(s.id)}
                  className={`rounded-full border px-2 py-1 text-xs ${picked.includes(s.id) ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                  {s.name}
                </button>
              ))}
              {!strategies.length && <EmptyState label="No strategies returned for this optimization." />}
            </CardContent>
          </Card>

          {selected.length > 0 && (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[720px] text-xs">
                <caption className="sr-only">Strategy comparison</caption>
                <thead className="bg-muted/40">
                  <tr>
                    <th scope="col" className="p-2 text-left">Dimension</th>
                    {selected.map((s) => (
                      <th key={s.id} scope="col" className="p-2 text-left">
                        <div className="flex items-center gap-1">{s.name} <StrategyStatusBadge status={s.status} /></div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <th scope="row" className="p-2 text-left font-medium">Confidence</th>
                    {selected.map((s) => <td key={s.id} className="p-2"><ConfidenceBar value={s.confidence} /></td>)}
                  </tr>
                  <tr className="border-t">
                    <th scope="row" className="p-2 text-left font-medium">Objective achievement</th>
                    {selected.map((s) => <td key={s.id} className="p-2">{(objectiveAchievement(s) * 100).toFixed(0)}%</td>)}
                  </tr>
                  {COMPARISON_METRICS.map((m) => {
                    const b = best(m.key, m.better);
                    return (
                      <tr key={m.key} className="border-t">
                        <th scope="row" className="p-2 text-left font-medium">{m.label}</th>
                        {selected.map((s) => {
                          const v = s.metrics[m.key];
                          return (
                            <td key={s.id} className="p-2">
                              {Number.isFinite(v) ? (
                                <span className={b != null && v === b ? "font-semibold text-emerald-400" : ""}>{v}</span>
                              ) : <span className="text-muted-foreground">—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  <tr className="border-t">
                    <th scope="row" className="p-2 text-left font-medium">Binding constraints</th>
                    {selected.map((s) => (
                      <td key={s.id} className="p-2">
                        {s.constraints.filter((c) => c.binding || !c.satisfied).map((c) => c.label).join(", ") || "—"}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-t">
                    <th scope="row" className="p-2 text-left font-medium">Top risks</th>
                    {selected.map((s) => (
                      <td key={s.id} className="p-2">{s.risks.slice(0, 3).map((r) => r.label).join(", ") || "—"}</td>
                    ))}
                  </tr>
                  <tr className="border-t">
                    <th scope="row" className="p-2 text-left font-medium">Pareto</th>
                    {selected.map((s) => (
                      <td key={s.id} className="p-2">
                        {s.pareto ? <Badge variant="secondary" className="text-[10px]">nondominated</Badge> : "—"}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-t">
                    <th scope="row" className="p-2 text-left font-medium">Sacrificed</th>
                    {selected.map((s) => <td key={s.id} className="p-2">{s.costs.join("; ") || "—"}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {assistant.error && <ErrorState error={assistant.error} />}
          {assistant.answer && (
            <Card className="bg-card/60 backdrop-blur">
              <CardHeader className="pb-2"><CardTitle className="text-sm">WOIC tradeoff analysis</CardTitle></CardHeader>
              <CardContent><p className="max-h-72 overflow-auto whitespace-pre-wrap text-xs">{assistant.answer}</p></CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
