import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";
import { OptimizationSelect, useSelectedOptId } from "@/components/optimization/OptBits";
import { useOptimizationAssistant, useOptimizationHistory } from "@/hooks/optimization/use-optimization";
import { RISK_DOMAINS } from "@/lib/optimization/platform";

export default function RiskTradeoffs() {
  const { records, isLoading, error } = useOptimizationHistory();
  const [optId, setOptId] = useSelectedOptId();
  const assistant = useOptimizationAssistant();

  const record = records.find((r) => r.id === optId) ?? records[0] ?? null;

  const risks = useMemo(
    () => (record?.strategies ?? []).flatMap((s) => s.risks.map((r) => ({ ...r, strategy: s.name }))),
    [record],
  );

  if (isLoading) return <LoadingState label="Loading risk profile…" />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <OptimizationSelect records={records} value={optId} onChange={setOptId} />
        <Button size="sm" variant="outline" disabled={!risks.length || assistant.pending}
          onClick={() => assistant.ask("risk_summary", risks)}>
          {assistant.pending ? "Consulting WOIC…" : "Summarize risks"}
        </Button>
        <Button size="sm" variant="outline" disabled={!record || assistant.pending}
          onClick={() => record && assistant.ask("uncertainty", record)}>
          What uncertainty remains?
        </Button>
      </div>

      {!record ? <EmptyState label="Run an optimization to see its risk surface." /> : (
        <div className="grid gap-3 lg:grid-cols-2">
          <Card className="bg-card/60 backdrop-blur">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Risk by domain</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs">
              {RISK_DOMAINS.map((domain) => {
                const items = risks.filter((r) => r.domain === domain);
                if (!items.length) return null;
                const exposure = items.reduce((a, r) => a + r.probability * r.impact, 0) / items.length;
                return (
                  <div key={domain} className="rounded border p-2">
                    <div className="flex items-center gap-2">
                      <span className="flex-1 font-medium capitalize">{domain.replace(/_/g, " ")}</span>
                      <Badge variant={exposure > 0.5 ? "destructive" : exposure > 0.25 ? "outline" : "secondary"} className="text-[10px]">
                        exposure {(exposure * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <ul className="mt-1 space-y-0.5 text-muted-foreground">
                      {items.slice(0, 5).map((r, i) => (
                        <li key={i}>
                          {r.label} — p {r.probability.toFixed(2)}, impact {r.impact.toFixed(2)}, confidence {r.confidence.toFixed(2)} ({r.strategy})
                          {r.organisms.length ? ` · affects ${r.organisms.join(", ")}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              {!risks.length && <EmptyState label="No risks reported by the engine." />}
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Objective conflicts & tradeoffs</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs">
              {record.conflicts.length ? record.conflicts.map((c, i) => (
                <p key={i} className="rounded border p-2">
                  <strong>{c.a} ↔ {c.b}</strong> — {c.detail}
                </p>
              )) : <EmptyState label="The engine reported no objective conflicts." />}
              {record.explanation && (
                <p className="whitespace-pre-wrap text-muted-foreground">{record.explanation}</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {assistant.error && <ErrorState error={assistant.error} />}
      {assistant.answer && (
        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-2"><CardTitle className="text-sm">WOIC risk analysis</CardTitle></CardHeader>
          <CardContent><p className="max-h-72 overflow-auto whitespace-pre-wrap text-xs">{assistant.answer}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
