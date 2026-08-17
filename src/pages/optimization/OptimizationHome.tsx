import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";
import {
  ConfidenceBar, DegradedState, ModeBadge, OptimizationSelect, useSelectedOptId,
} from "@/components/optimization/OptBits";
import {
  useDecisionQueue, useOptCalibrationLog, useOptSettings, useOptimizationAssistant,
  useOptimizationHistory, useOptimizationRuns, useOptimizationTranslation,
} from "@/hooks/optimization/use-optimization";
import {
  objectiveAchievement, optMode, optName, optimizationError, recommendedStrategy,
} from "@/lib/optimization/platform";
import { useNavigate } from "react-router-dom";

export default function OptimizationHome() {
  const { records, isLoading, error } = useOptimizationHistory();
  const runs = useOptimizationRuns();
  const [settings] = useOptSettings();
  const [calibration] = useOptCalibrationLog();
  const [queue] = useDecisionQueue();
  const [simId, setSimId] = useSelectedOptId();
  const assistant = useOptimizationAssistant();
  const translation = useOptimizationTranslation();
  const [ask, setAsk] = useState("");
  const navigate = useNavigate();

  if (isLoading) return <LoadingState label="Loading optimization workspace…" />;
  if (error) return <ErrorState error={error} />;

  const selected = records.find((r) => r.id === simId) ?? records[0] ?? null;
  const conflicts = records.flatMap((r) => r.conflicts.map((c) => ({ ...c, opt: optName(r), id: r.id })));
  const achievement = records.length
    ? records.reduce((a, r) => {
        const s = recommendedStrategy(r);
        return a + (s ? objectiveAchievement(s) : 0);
      }, 0) / records.length
    : null;
  const accuracy = calibration.length
    ? 1 - calibration.reduce((a, c) => a + optimizationError(c), 0) / calibration.length
    : null;

  const stats = [
    { label: "Optimizations", value: String(records.length) },
    { label: "Active runs", value: String(runs.filter((r) => r.status === "running").length) },
    { label: "Objective achievement", value: achievement == null ? "—" : `${(achievement * 100).toFixed(0)}%` },
    { label: "Optimization accuracy", value: accuracy == null ? "—" : `${(accuracy * 100).toFixed(0)}%` },
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="bg-card/60 backdrop-blur">
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">{s.label}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-semibold">{s.value}</p></CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Ask for an optimization</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Textarea rows={2} value={ask} onChange={(e) => setAsk(e.target.value)}
            placeholder="Find the lowest-cost schedule that avoids overtime and keeps every required certification covered." />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={!ask.trim() || translation.pending}
              onClick={() => navigate(`/optimization/objectives?ask=${encodeURIComponent(ask)}`)}>
              Translate in Objective Builder
            </Button>
            <Button size="sm" variant="outline" disabled={assistant.pending || !records.length}
              onClick={() => assistant.ask("recommend_optimizations", records.slice(0, 10).map((r) => ({ name: optName(r), question: r.question })))}>
              {assistant.pending ? "Consulting WOIC…" : "Recommend optimizations"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            WOIC converts the request into objectives, weights, constraints, entities, resources, horizon and mode. You review and edit before anything runs.
          </p>
          {assistant.error && <ErrorState error={assistant.error} />}
          {assistant.answer && (
            <p className="max-h-56 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-2 text-xs">{assistant.answer}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="bg-card/60 backdrop-blur lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Recent optimizations</CardTitle>
            <OptimizationSelect records={records} value={simId} onChange={setSimId} />
          </CardHeader>
          <CardContent>
            {!records.length ? (
              <EmptyState label="No optimizations yet. Define objectives to run the first one." />
            ) : (
              <ul className="space-y-2">
                {records.slice(0, 8).map((r) => {
                  const s = recommendedStrategy(r);
                  return (
                    <li key={r.id} className="rounded-md border p-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link to={`/optimization/strategies?opt=${r.id}`} className="truncate text-sm font-medium hover:underline">
                          {optName(r)}
                        </Link>
                        <div className="flex items-center gap-1">
                          <ModeBadge mode={optMode(r)} />
                          <Badge variant="outline" className="text-[10px]">{r.strategies.length} strategies</Badge>
                        </div>
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{s?.summary || r.explanation || "No engine summary returned."}</p>
                      <div className="mt-1"><ConfidenceBar value={r.confidence} threshold={settings.confidenceThreshold} /></div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Card className="bg-card/60 backdrop-blur">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Active runs</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-xs">
              {!runs.length ? <EmptyState label="No runs this session." /> : runs.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{r.name}</span>
                  <Badge variant={r.status === "failed" ? "destructive" : "secondary"} className="text-[10px]">{r.status}</Badge>
                </div>
              ))}
              <Button asChild size="sm" variant="ghost" className="w-full"><Link to="/optimization/runs">Open Optimization Runs</Link></Button>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Unresolved constraint conflicts</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-xs">
              {!conflicts.length ? <EmptyState label="The engine reported no constraint conflicts." /> :
                conflicts.slice(0, 6).map((c, i) => (
                  <p key={i} className="rounded border border-amber-500/40 bg-amber-500/5 p-1.5">
                    <span className="font-medium">{c.a} ↔ {c.b}</span> — {c.detail || "conflict reported"} <span className="text-muted-foreground">({c.opt})</span>
                  </p>
                ))}
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Recent strategy decisions</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-xs">
              {!queue.length ? <EmptyState label="No strategies routed to Decision Intelligence yet." /> :
                queue.slice(0, 5).map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{d.strategyName}</span>
                    <Badge variant={d.status === "failed" ? "destructive" : "secondary"} className="text-[10px]">{d.status.replace("_", " ")}</Badge>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-2"><CardTitle className="text-sm">High-impact opportunities</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-xs">
            {!selected ? <EmptyState label="Select an optimization to see engine-reported opportunities." /> :
              !selected.strategies.length ? (
                <DegradedState title="No strategies returned" detail="The engine returned no strategy set for this optimization." />
              ) : (
                selected.strategies.slice(0, 6).map((s) => (
                  <div key={s.id} className="rounded border p-1.5">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-muted-foreground">{s.benefits[0] ?? s.summary || "No benefit reported."}</p>
                  </div>
                ))
              )}
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Calibration trend</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-xs">
            {!calibration.length ? <EmptyState label="Record actual outcomes in Calibration to build a trend." /> : (
              <>
                <p>{calibration.length} calibration records</p>
                <p className="text-muted-foreground">
                  Mean optimization error {(calibration.reduce((a, c) => a + optimizationError(c), 0) / calibration.length).toFixed(2)} ·
                  constraint incidents {calibration.reduce((a, c) => a + c.constraintIncidents, 0)}
                </p>
                <Button asChild size="sm" variant="ghost"><Link to="/optimization/calibration">Open Calibration</Link></Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
