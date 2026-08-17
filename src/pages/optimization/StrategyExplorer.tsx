import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";
import {
  ConfidenceBar, DegradedState, EnforcementBadge, ObjectiveMeter, OptimizationSelect,
  StrategyStatusBadge, useSelectedOptId,
} from "@/components/optimization/OptBits";
import {
  useDecisionHandoff, useOptSettings, useOptimizationAssistant, useOptimizationHistory,
  useOptimizationPermissions, useStrategySimulation,
} from "@/hooks/optimization/use-optimization";
import { objectiveAchievement, optName, violatesHardConstraint } from "@/lib/optimization/platform";
import { useToast } from "@/hooks/use-toast";

export default function StrategyExplorer() {
  const { records, isLoading, error } = useOptimizationHistory();
  const [optId, setOptId] = useSelectedOptId();
  const [settings] = useOptSettings();
  const assistant = useOptimizationAssistant();
  const simulation = useStrategySimulation();
  const handoff = useDecisionHandoff();
  const permissions = useOptimizationPermissions();
  const { toast } = useToast();
  const [openId, setOpenId] = useState<string | null>(null);

  if (isLoading) return <LoadingState label="Loading strategies…" />;
  if (error) return <ErrorState error={error} />;

  const record = records.find((r) => r.id === optId) ?? records[0] ?? null;
  const executive = settings.view === "executive";

  const send = async (strategyId: string) => {
    if (!record) return;
    const strategy = record.strategies.find((s) => s.id === strategyId);
    if (!strategy) return;
    if (!permissions.can("approve")) { toast({ title: "Approval authority required", description: "Your role cannot route strategies to Decision Intelligence.", variant: "destructive" }); return; }
    const result = await handoff.send(record, strategy);
    toast({
      title: result?.status === "failed" ? "Decision Console unavailable" : "Sent to Decision Console",
      description: result?.status === "failed" ? result.detail : "The strategy awaits review and approval. Nothing has been executed.",
      variant: result?.status === "failed" ? "destructive" : undefined,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <OptimizationSelect records={records} value={optId} onChange={setOptId} />
        {record && <Badge variant="outline" className="text-[10px]">{record.strategies.length} strategies</Badge>}
        <Button size="sm" variant="outline" disabled={!record || assistant.pending}
          onClick={() => record && assistant.ask("explain_recommendation", record)}>
          {assistant.pending ? "Consulting WOIC…" : "Explain the recommendation"}
        </Button>
        <Button size="sm" variant="outline" disabled={!record || assistant.pending}
          onClick={() => record && assistant.ask("why_rejected", record.strategies.filter((s) => s.status === "rejected"))}>
          Why were options rejected?
        </Button>
      </div>

      {assistant.error && <ErrorState error={assistant.error} />}
      {assistant.answer && (
        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-2"><CardTitle className="text-sm">WOIC explanation</CardTitle></CardHeader>
          <CardContent><p className="max-h-72 overflow-auto whitespace-pre-wrap text-xs">{assistant.answer}</p></CardContent>
        </Card>
      )}

      {!record ? <EmptyState label="No optimizations yet. Define objectives and run one." /> :
        !record.strategies.length ? (
          <DegradedState title="The engine returned no strategies"
            detail="The Platform Optimization Engine responded without a strategy set for this request." />
        ) : (
          <div className="space-y-2">
            {record.strategies.map((s) => {
              const open = openId === s.id;
              const projection = simulation.projections[s.id];
              return (
                <Card key={s.id} className={s.status === "recommended" ? "border-emerald-500/40 bg-card/60 backdrop-blur" : "bg-card/60 backdrop-blur"}>
                  <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 pb-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <CardTitle className="truncate text-sm">{s.name}</CardTitle>
                      <StrategyStatusBadge status={s.status} />
                      {violatesHardConstraint(s) && <Badge variant="destructive" className="text-[10px]">hard constraint violated</Badge>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setOpenId(open ? null : s.id)}>{open ? "Collapse" : "Details"}</Button>
                      <Button size="sm" variant="outline" disabled={simulation.pending === s.id}
                        onClick={() => simulation.simulate(record, s)}>
                        {simulation.pending === s.id ? "Simulating…" : "Simulate"}
                      </Button>
                      <Button size="sm" disabled={s.status === "rejected" || handoff.pending === s.id} onClick={() => send(s.id)}>
                        {handoff.pending === s.id ? "Sending…" : "Send to Decision Console"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <p>{s.summary || "No summary returned by the engine."}</p>
                    <div className="grid gap-2 md:grid-cols-3">
                      <div className="space-y-1">
                        <ConfidenceBar value={s.confidence} threshold={settings.confidenceThreshold} />
                        <p className="text-muted-foreground">Objective achievement {(objectiveAchievement(s) * 100).toFixed(0)}%</p>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        {s.objectives.length ? s.objectives.slice(0, executive ? 3 : 8).map((o) => (
                          <ObjectiveMeter key={o.key} label={o.key} value={o.achievement} />
                        )) : <p className="text-muted-foreground">No objective achievement reported.</p>}
                      </div>
                    </div>

                    {s.status === "rejected" && (
                      <p className="rounded border border-destructive/40 bg-destructive/5 p-1.5">
                        <strong>Rejected:</strong> {s.rejection_reason || "The engine did not state a reason."}
                      </p>
                    )}

                    {open && (
                      <div className="grid gap-2 md:grid-cols-2">
                        <div>
                          <p className="font-medium">Costs</p>
                          <ul className="list-disc pl-4 text-muted-foreground">
                            {s.costs.length ? s.costs.map((c, i) => <li key={i}>{c}</li>) : <li>Not reported</li>}
                          </ul>
                          <p className="mt-1 font-medium">Benefits</p>
                          <ul className="list-disc pl-4 text-muted-foreground">
                            {s.benefits.length ? s.benefits.map((b, i) => <li key={i}>{b}</li>) : <li>Not reported</li>}
                          </ul>
                          <p className="mt-1 font-medium">Dependencies</p>
                          <ul className="list-disc pl-4 text-muted-foreground">
                            {s.dependencies.length ? s.dependencies.map((d, i) => <li key={i}>{d}</li>) : <li>Not reported</li>}
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium">Constraint satisfaction</p>
                          <ul className="space-y-1">
                            {s.constraints.length ? s.constraints.map((c, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <EnforcementBadge level={c.enforcement} />
                                <span className="flex-1 truncate">{c.label}</span>
                                <Badge variant={c.satisfied ? "secondary" : "destructive"} className="text-[10px]">
                                  {c.satisfied ? (c.binding ? "binding" : "satisfied") : "violated"}
                                </Badge>
                              </li>
                            )) : <li className="text-muted-foreground">Not reported</li>}
                          </ul>
                          <p className="mt-1 font-medium">Risks</p>
                          <ul className="list-disc pl-4 text-muted-foreground">
                            {s.risks.length ? s.risks.map((r, i) => (
                              <li key={i}>{r.domain}: {r.label} (p {r.probability.toFixed(2)}, impact {r.impact.toFixed(2)})</li>
                            )) : <li>Not reported</li>}
                          </ul>
                          <p className="mt-1 font-medium">Uncertainty</p>
                          <p className="text-muted-foreground">{s.uncertainty || "Not reported"}</p>
                          <p className="mt-1 font-medium">Approval required</p>
                          <p className="text-muted-foreground">
                            {(s.approval.roles.length ? s.approval.roles.join(", ") : "agency_admin")} — {s.approval.reason || "Strategy execution requires documented approval authority."}
                            {s.approval.policy ? ` Policy: ${s.approval.policy}.` : ""}
                            {s.approval.constitution ? ` Constitution: ${s.approval.constitution}.` : " Constitution: IWOS Constitution v1.0 §Decision Authority."}
                          </p>
                          {s.explanation && <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{s.explanation}</p>}
                        </div>
                      </div>
                    )}

                    {projection && (
                      <div className="rounded border border-dashed border-sky-500/40 p-1.5">
                        <p className="font-medium text-sky-400">PROJECTED (Simulation Workspace)</p>
                        <ul className="list-disc pl-4 text-muted-foreground">
                          {projection.outcomes.length ? projection.outcomes.map((o, i) => <li key={i}>{o}</li>) : <li>No projected outcomes returned.</li>}
                        </ul>
                        <p className="text-muted-foreground">Projection confidence {projection.confidence == null ? "—" : `${(projection.confidence * 100).toFixed(0)}%`}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {simulation.error && <ErrorState error={simulation.error} />}
            {handoff.error && <ErrorState error={handoff.error} />}
            <p className="text-xs text-muted-foreground">
              Selecting a strategy never executes it — {optName(record)} strategies are routed to Decision Intelligence for review, approval and only then automation.
            </p>
          </div>
        )}
    </div>
  );
}
