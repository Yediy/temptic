import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";
import { useAuth } from "@/lib/auth";
import { useSubgraph, useRiskPropagation, useTeamDependencies } from "@/hooks/graph/use-graph";
import { usePredict, useReason } from "@/hooks/woic/use-cognitive";
import { IMPACT_SCENARIOS } from "@/lib/graph/platform";

export default function ImpactAnalysis() {
  const { agencyId } = useAuth();
  const sub = useSubgraph(agencyId ?? undefined, { limit: 600 });
  const risk = useRiskPropagation();
  const deps = useTeamDependencies();
  const predict = usePredict();
  const reason = useReason();

  const [nodeId, setNodeId] = useState("");
  const [scenario, setScenario] = useState<string>(IMPACT_SCENARIOS[0].key);
  const [narrative, setNarrative] = useState("");

  const nodes = sub.data?.nodes ?? [];
  const node = useMemo(() => nodes.find((n) => n.id === nodeId) ?? null, [nodes, nodeId]);
  const active = IMPACT_SCENARIOS.find((s) => s.key === scenario) ?? IMPACT_SCENARIOS[0];

  const run = () => {
    if (!agencyId || !node) return;
    setNarrative("");
    risk.mutate({ agency_id: agencyId, node_id: node.id });
    deps.mutate({ agency_id: agencyId, node_id: node.id });
    const vars = {
      agency_id: agencyId,
      subject: node.label,
      subject_type: node.entity_type,
      node_id: node.id,
      question: `${active.prompt} Subject: "${node.label}" (${node.entity_type}). Which Platform Organisms are impacted, in what order, and how severe is the cascade?`,
    };
    const target = scenario === "project_slips" || scenario === "automation_fails" ? predict : reason;
    target.mutate(vars, {
      onSuccess: (data) => {
        const d = data as Record<string, unknown>;
        setNarrative(String(d.answer ?? d.summary ?? d.explanation ?? d.prediction ?? JSON.stringify(d).slice(0, 1500)));
      },
      onError: (e) => setNarrative(e instanceof Error ? e.message : "Cognitive core unavailable."),
    });
  };

  if (sub.isLoading) return <LoadingState label="Loading platform organisms…" />;
  if (sub.error) return <ErrorState error={sub.error} />;

  const impacted = (risk.data?.impacted ?? []) as Array<Record<string, unknown>>;

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Scenario</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <select aria-label="Subject node" value={nodeId} onChange={(e) => setNodeId(e.target.value)}
            className="h-9 w-full rounded-md border bg-background px-2 text-sm">
            <option value="">Select a Platform Organism…</option>
            {nodes.map((n) => <option key={n.id} value={n.id}>{n.label} · {n.entity_type}</option>)}
          </select>
          <div className="space-y-1">
            {IMPACT_SCENARIOS.map((s) => (
              <button key={s.key} type="button" onClick={() => setScenario(s.key)}
                className={`w-full rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${
                  s.key === scenario ? "border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {s.label}
              </button>
            ))}
          </div>
          <Button size="sm" className="w-full" disabled={!node || !agencyId} onClick={run}>
            Run impact analysis
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Impacted organisms</CardTitle></CardHeader>
        <CardContent>
          {risk.isPending ? <LoadingState label="Propagating impact…" /> :
           !impacted.length ? <EmptyState label="Select a subject and run the analysis." /> : (
            <ul className="max-h-[26rem] space-y-1 overflow-auto text-sm">
              {impacted.map((r, i) => (
                <li key={i} className="flex items-center justify-between gap-2 border-b py-1">
                  <span className="truncate">{String(r.label)}</span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    hop {String(r.depth ?? r.hops ?? "-")}
                    <Badge variant={Number(r.risk ?? 0) > 0.6 ? "destructive" : "secondary"} className="text-[10px]">
                      risk {Number(r.risk ?? 0).toFixed(2)}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
           )}
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Cascade narrative & dependencies</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(predict.isPending || reason.isPending) && <LoadingState label="Consulting WOIC…" />}
          {narrative && <p className="whitespace-pre-wrap rounded-md border bg-muted/40 p-2 text-xs">{narrative}</p>}
          {(deps.data?.dependencies ?? []).length > 0 && (
            <ul className="max-h-56 space-y-1 overflow-auto text-xs">
              {(deps.data?.dependencies ?? []).map((d, i) => (
                <li key={i} className="flex justify-between gap-2 border-b py-1">
                  <span className="truncate">{String((d as Record<string, unknown>).label)}</span>
                  <span className="text-muted-foreground">{String((d as Record<string, unknown>).relation ?? "depends on")}</span>
                </li>
              ))}
            </ul>
          )}
          {!narrative && !deps.data && <p className="text-xs text-muted-foreground">No analysis run yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
