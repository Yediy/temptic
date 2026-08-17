import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";
import { OptimizationSelect, StrategyStatusBadge, useSelectedOptId } from "@/components/optimization/OptBits";
import { useOptimizationAssistant, useOptimizationHistory } from "@/hooks/optimization/use-optimization";
import { COMPARISON_METRICS, type Strategy } from "@/lib/optimization/platform";

export default function ParetoExplorer() {
  const { records, isLoading, error } = useOptimizationHistory();
  const [optId, setOptId] = useSelectedOptId();
  const assistant = useOptimizationAssistant();
  const [xKey, setXKey] = useState("cost");
  const [yKey, setYKey] = useState("risk");
  const [hover, setHover] = useState<Strategy | null>(null);

  const record = records.find((r) => r.id === optId) ?? records[0] ?? null;
  const strategies = useMemo(
    () => (record?.strategies ?? []).filter((s) => Number.isFinite(s.metrics[xKey]) && Number.isFinite(s.metrics[yKey])),
    [record, xKey, yKey],
  );

  const frontier = useMemo(() => {
    const set = new Set<string>();
    strategies.forEach((a) => {
      const dominated = strategies.some(
        (b) => b.id !== a.id && b.metrics[xKey] <= a.metrics[xKey] && b.metrics[yKey] <= a.metrics[yKey] &&
          (b.metrics[xKey] < a.metrics[xKey] || b.metrics[yKey] < a.metrics[yKey]),
      );
      if (!dominated) set.add(a.id);
    });
    return set;
  }, [strategies, xKey, yKey]);

  if (isLoading) return <LoadingState label="Loading frontier…" />;
  if (error) return <ErrorState error={error} />;

  const xs = strategies.map((s) => s.metrics[xKey]);
  const ys = strategies.map((s) => s.metrics[yKey]);
  const scale = (v: number, vals: number[]) => {
    const min = Math.min(...vals), max = Math.max(...vals);
    return max === min ? 50 : ((v - min) / (max - min)) * 88 + 6;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <OptimizationSelect records={records} value={optId} onChange={setOptId} />
        <select value={xKey} onChange={(e) => setXKey(e.target.value)} aria-label="X axis metric"
          className="h-9 rounded-md border bg-background px-2 text-sm">
          {COMPARISON_METRICS.map((m) => <option key={m.key} value={m.key}>X · {m.label}</option>)}
        </select>
        <select value={yKey} onChange={(e) => setYKey(e.target.value)} aria-label="Y axis metric"
          className="h-9 rounded-md border bg-background px-2 text-sm">
          {COMPARISON_METRICS.map((m) => <option key={m.key} value={m.key}>Y · {m.label}</option>)}
        </select>
        <Button size="sm" variant="outline" disabled={!strategies.length || assistant.pending}
          onClick={() => assistant.ask("pareto_reasoning", strategies)}>
          {assistant.pending ? "Consulting WOIC…" : "Explain the frontier"}
        </Button>
      </div>

      {!strategies.length ? (
        <EmptyState label="No strategies expose both selected metrics." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-3">
          <Card className="bg-card/60 backdrop-blur lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Nondominated frontier (lower is better on both axes)</CardTitle></CardHeader>
            <CardContent>
              <div className="relative h-80 w-full rounded-md border bg-muted/10">
                {strategies.map((s) => {
                  const on = frontier.has(s.id) || s.pareto;
                  return (
                    <button key={s.id} type="button" aria-label={s.name}
                      onMouseEnter={() => setHover(s)} onFocus={() => setHover(s)} onClick={() => setHover(s)}
                      className={`absolute -translate-x-1/2 translate-y-1/2 rounded-full border-2 transition-transform hover:scale-125 ${
                        on ? "border-emerald-400 bg-emerald-400/40" : "border-muted-foreground/50 bg-muted-foreground/20"
                      } ${hover?.id === s.id ? "scale-125" : ""}`}
                      style={{ left: `${scale(s.metrics[xKey], xs)}%`, bottom: `${scale(s.metrics[yKey], ys)}%`, width: 14, height: 14 }} />
                  );
                })}
                <span className="absolute bottom-1 right-2 text-[10px] text-muted-foreground">
                  {COMPARISON_METRICS.find((m) => m.key === xKey)?.label} →
                </span>
                <span className="absolute left-2 top-1 text-[10px] text-muted-foreground">
                  ↑ {COMPARISON_METRICS.find((m) => m.key === yKey)?.label}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Card className="bg-card/60 backdrop-blur">
              <CardHeader className="pb-2"><CardTitle className="text-sm">{hover ? hover.name : "Select a point"}</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-xs">
                {hover ? (
                  <>
                    <div className="flex items-center gap-2">
                      <StrategyStatusBadge status={hover.status} />
                      {(frontier.has(hover.id) || hover.pareto) && <Badge variant="secondary" className="text-[10px]">nondominated</Badge>}
                    </div>
                    <p>{hover.summary || "No summary reported."}</p>
                    <p className="text-muted-foreground">
                      {COMPARISON_METRICS.find((m) => m.key === xKey)?.label}: {hover.metrics[xKey]} ·{" "}
                      {COMPARISON_METRICS.find((m) => m.key === yKey)?.label}: {hover.metrics[yKey]}
                    </p>
                    <p className="text-muted-foreground">Sacrifices: {hover.costs.join("; ") || "not reported"}</p>
                  </>
                ) : <p className="text-muted-foreground">Hover or select a strategy point to inspect its tradeoff position.</p>}
              </CardContent>
            </Card>

            <Card className="bg-card/60 backdrop-blur">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Frontier ({frontier.size})</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-xs">
                {strategies.filter((s) => frontier.has(s.id)).map((s) => (
                  <button key={s.id} type="button" onClick={() => setHover(s)} className="block w-full truncate text-left hover:text-primary">
                    {s.name}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {assistant.error && <ErrorState error={assistant.error} />}
      {assistant.answer && (
        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-2"><CardTitle className="text-sm">WOIC frontier reasoning</CardTitle></CardHeader>
          <CardContent><p className="max-h-72 overflow-auto whitespace-pre-wrap text-xs">{assistant.answer}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
