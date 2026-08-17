import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/woic/AsyncState";
import { OptimizationSelect, useSelectedOptId } from "@/components/optimization/OptBits";
import { useOptCalibrationLog, useOptimizationHistory } from "@/hooks/optimization/use-optimization";
import { objectiveAchievement, optMode, optName, optimizationError, recommendedStrategy } from "@/lib/optimization/platform";
import { useToast } from "@/hooks/use-toast";

export default function OptCalibration() {
  const { records, isLoading, error } = useOptimizationHistory();
  const [optId, setOptId] = useSelectedOptId();
  const [log, setLog] = useOptCalibrationLog();
  const { toast } = useToast();
  const [chosen, setChosen] = useState("");
  const [actual, setActual] = useState("");
  const [effects, setEffects] = useState("");
  const [incidents, setIncidents] = useState(0);

  if (isLoading) return <LoadingState label="Loading calibration data…" />;
  if (error) return <ErrorState error={error} />;

  const record = records.find((r) => r.id === optId) ?? records[0] ?? null;
  const recommended = record ? recommendedStrategy(record) : null;
  const avgError = log.length ? log.reduce((a, c) => a + optimizationError(c), 0) / log.length : null;

  const save = () => {
    if (!record || !recommended) return;
    setLog([
      {
        id: crypto.randomUUID(),
        optimizationId: record.id,
        optimizationName: optName(record),
        mode: optMode(record),
        recordedAt: new Date().toISOString(),
        recommendedStrategy: recommended.name,
        chosenStrategy: chosen || recommended.name,
        expectedConfidence: recommended.confidence,
        objectiveAchievement: objectiveAchievement(recommended),
        predictionError: Math.abs(recommended.confidence - objectiveAchievement(recommended)),
        constraintIncidents: incidents,
        secondOrderEffects: effects,
        actualOutcome: actual,
      },
      ...log,
    ].slice(0, 200));
    setChosen(""); setActual(""); setEffects(""); setIncidents(0);
    toast({ title: "Outcome recorded", description: "Calibration feeds future optimization accuracy." });
  };

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Record a real outcome</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs">
          <OptimizationSelect records={records} value={optId} onChange={setOptId} />
          {recommended ? (
            <>
              <p className="text-muted-foreground">
                Recommended: <strong>{recommended.name}</strong> · expected confidence {(recommended.confidence * 100).toFixed(0)}% ·
                objective achievement {(objectiveAchievement(recommended) * 100).toFixed(0)}%
              </p>
              <Input value={chosen} placeholder="Strategy actually executed" onChange={(e) => setChosen(e.target.value)} />
              <Textarea rows={2} value={actual} placeholder="What actually happened?" onChange={(e) => setActual(e.target.value)} />
              <Textarea rows={2} value={effects} placeholder="Second-order effects observed" onChange={(e) => setEffects(e.target.value)} />
              <label className="flex items-center gap-2">
                Constraint incidents
                <Input type="number" min={0} className="h-8 w-24" value={incidents}
                  onChange={(e) => setIncidents(Number(e.target.value))} />
              </label>
              <Button size="sm" onClick={save}>Save outcome</Button>
            </>
          ) : <EmptyState label="Select an optimization with a recommended strategy." />}
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm">Calibration history ({log.length})</CardTitle>
          {avgError != null && <Badge variant="outline" className="text-[10px]">avg error {(avgError * 100).toFixed(0)}%</Badge>}
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {log.length ? log.slice(0, 30).map((c) => (
            <div key={c.id} className="rounded border p-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex-1 truncate font-medium">{c.optimizationName}</span>
                <Badge variant="outline" className="text-[10px]">{c.mode}</Badge>
                <Badge variant={optimizationError(c) > 0.3 ? "destructive" : "secondary"} className="text-[10px]">
                  error {(optimizationError(c) * 100).toFixed(0)}%
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Recommended {c.recommendedStrategy} · executed {c.chosenStrategy} · {new Date(c.recordedAt).toLocaleDateString()} ·
                {" "}{c.constraintIncidents} constraint incidents
              </p>
              {c.actualOutcome && <p className="text-muted-foreground">Outcome: {c.actualOutcome}</p>}
              {c.secondOrderEffects && <p className="text-muted-foreground">Second-order: {c.secondOrderEffects}</p>}
            </div>
          )) : <EmptyState label="No outcomes recorded yet." />}
        </CardContent>
      </Card>
    </div>
  );
}
