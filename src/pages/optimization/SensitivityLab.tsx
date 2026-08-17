import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";
import { OptimizationSelect, useSelectedOptId } from "@/components/optimization/OptBits";
import {
  useDraftDefinition, useOptimizationAssistant, useOptimizationHistory, useRunOptimization,
} from "@/hooks/optimization/use-optimization";
import { optObjectives, optName, type Objective } from "@/lib/optimization/platform";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function SensitivityLab() {
  const { records, isLoading, error } = useOptimizationHistory();
  const [optId, setOptId] = useSelectedOptId();
  const [, setDraft] = useDraftDefinition();
  const { run } = useRunOptimization();
  const assistant = useOptimizationAssistant();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  if (isLoading) return <LoadingState label="Loading sensitivity readings…" />;
  if (error) return <ErrorState error={error} />;

  const record = records.find((r) => r.id === optId) ?? records[0] ?? null;
  const objectives: Objective[] = record ? optObjectives(record) : [];
  const weightOf = (o: Objective) => weights[o.key] ?? o.weight;

  const rerun = async () => {
    if (!record) return;
    setBusy(true);
    try {
      const def = {
        ...(record.inputs as unknown as Record<string, unknown>),
        objectives: objectives.map((o) => ({ ...o, weight: weightOf(o) })),
      } as never;
      setDraft(def);
      const next = await run(def);
      if (next) { toast({ title: "Re-optimized with adjusted weights" }); navigate(`/optimization/strategies?opt=${next.id}`); }
    } catch (e) {
      toast({ title: "Re-optimization failed", description: e instanceof Error ? e.message : "Engine unavailable.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <OptimizationSelect records={records} value={optId} onChange={setOptId} />
        <Button size="sm" variant="outline" disabled={!record || assistant.pending}
          onClick={() => record && assistant.ask("binding_constraints", record)}>
          {assistant.pending ? "Consulting WOIC…" : "Which constraints bind?"}
        </Button>
        <Button size="sm" variant="outline" disabled={!record || assistant.pending}
          onClick={() => record && assistant.ask("cheaper_option_blocked", record)}>
          What blocks a cheaper option?
        </Button>
      </div>

      {!record ? <EmptyState label="Run an optimization to explore its sensitivity." /> : (
        <div className="grid gap-3 lg:grid-cols-2">
          <Card className="bg-card/60 backdrop-blur">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Adjust objective weights — {optName(record)}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs">
              {objectives.length ? objectives.map((o) => (
                <label key={o.key} className="flex items-center gap-2">
                  <span className="w-40 truncate">{o.label || o.key}</span>
                  <input type="range" min={0} max={1} step={0.05} value={weightOf(o)} className="flex-1"
                    onChange={(e) => setWeights((w) => ({ ...w, [o.key]: Number(e.target.value) }))} />
                  <span className="w-10 text-right">{weightOf(o).toFixed(2)}</span>
                </label>
              )) : <EmptyState label="This optimization recorded no objective weights." />}
              <div className="flex gap-2 pt-1">
                <Button size="sm" disabled={busy || !objectives.length} onClick={rerun}>
                  {busy ? "Re-optimizing…" : "Re-optimize with new weights"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setWeights({})}>Reset</Button>
              </div>
              <p className="text-muted-foreground">
                Weight changes never relax HARD constraints — the engine re-solves within the same inviolable boundary.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Engine sensitivity readings</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs">
              {record.sensitivity.length ? record.sensitivity.map((s, i) => (
                <div key={i} className="rounded border p-2">
                  <div className="flex items-center gap-2">
                    <span className="flex-1 truncate font-medium">{s.variable}</span>
                    <Badge variant="outline" className="text-[10px]">influence {(s.influence * 100).toFixed(0)}%</Badge>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded bg-muted">
                    <div className="h-1.5 rounded bg-primary" style={{ width: `${Math.min(100, Math.max(0, s.influence * 100))}%` }} />
                  </div>
                  {s.binding_constraint && <p className="mt-1 text-muted-foreground">Binding: {s.binding_constraint}</p>}
                  {s.switch_threshold && <p className="text-muted-foreground">Switches strategy at: {s.switch_threshold}</p>}
                  {s.note && <p className="text-muted-foreground">{s.note}</p>}
                </div>
              )) : <EmptyState label="The engine returned no sensitivity readings for this optimization." />}
            </CardContent>
          </Card>
        </div>
      )}

      {assistant.error && <ErrorState error={assistant.error} />}
      {assistant.answer && (
        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-2"><CardTitle className="text-sm">WOIC analysis</CardTitle></CardHeader>
          <CardContent><p className="max-h-72 overflow-auto whitespace-pre-wrap text-xs">{assistant.answer}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
