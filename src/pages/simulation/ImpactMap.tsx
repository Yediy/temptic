import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";
import GraphCanvas from "@/components/graph/GraphCanvas";
import { ProjectionBadge, SimulationSelect, useSelectedSimId } from "@/components/simulation/SimBits";
import { useAuth } from "@/lib/auth";
import { useGraphTaxonomy, useRiskPropagation, useSubgraph, useTeamDependencies } from "@/hooks/graph/use-graph";
import { useSimSettings, useSimulationAssistant, useSimulationHistory } from "@/hooks/simulation/use-simulation";
import { simName } from "@/lib/simulation/platform";

export default function ImpactMap() {
  const { agencyId } = useAuth();
  const [settings] = useSimSettings();
  const { records } = useSimulationHistory(200);
  const [simId, setSimId] = useSelectedSimId();
  const [nodeId, setNodeId] = useState("");
  const sub = useSubgraph(agencyId ?? undefined, { limit: settings.graphNodeLimit });
  const taxonomy = useGraphTaxonomy(agencyId ?? undefined);
  const risk = useRiskPropagation();
  const deps = useTeamDependencies();
  const assistant = useSimulationAssistant();

  const nodes = sub.data?.nodes ?? [];
  const edges = sub.data?.edges ?? [];
  const sim = records.find((r) => r.id === simId) ?? null;

  const colorForType = useMemo(() => {
    const map = new Map((taxonomy.data?.node_types ?? []).map((t) => [t.key, t.color ?? "#64748b"]));
    return (type: string) => map.get(type) ?? "#64748b";
  }, [taxonomy.data]);

  const impacted = (risk.data?.impacted ?? []) as Array<Record<string, unknown>>;
  const overlay = useMemo(() => {
    const o: Record<string, number> = {};
    impacted.forEach((r) => { o[String(r.id ?? r.node_id ?? "")] = Number(r.risk ?? 0); });
    return o;
  }, [impacted]);

  if (sub.isLoading) return <LoadingState label="Loading Platform Graph…" />;
  if (sub.error) return <ErrorState error={sub.error} />;

  const trace = () => {
    if (!agencyId || !nodeId) return;
    risk.mutate({ agency_id: agencyId, node_id: nodeId });
    deps.mutate({ agency_id: agencyId, node_id: nodeId });
  };

  return (
    <div className="grid gap-3 lg:grid-cols-4">
      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Cascade source</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <SimulationSelect records={records} value={simId} onChange={setSimId} />
          <select aria-label="Subject node" value={nodeId} onChange={(e) => setNodeId(e.target.value)}
            className="h-9 w-full rounded-md border bg-background px-2 text-sm">
            <option value="">Select a Platform Organism…</option>
            {nodes.map((n) => <option key={n.id} value={n.id}>{n.label} · {n.entity_type}</option>)}
          </select>
          <Button size="sm" className="w-full" disabled={!nodeId || risk.isPending} onClick={trace}>
            {risk.isPending ? "Tracing cascade…" : "Trace impact"}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Traversal and risk propagation run in the Platform Graph Intelligence APIs — never in the browser.
          </p>
          {sim && (
            <div className="rounded-md border border-dashed border-sky-500/40 p-2 text-[11px]">
              <ProjectionBadge kind="PROJECTED" /> <span className="ml-1">{simName(sim)}</span>
            </div>
          )}
          <Button size="sm" variant="outline" className="w-full" disabled={assistant.pending || !impacted.length}
            onClick={() => assistant.ask("summarize_risks", { simulation: sim, impacted, dependencies: deps.data?.dependencies ?? [] })}>
            {assistant.pending ? "Consulting WOIC…" : "Explain the cascade"}
          </Button>
          {assistant.answer && (
            <p className="max-h-56 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-2 text-[11px]">{assistant.answer}</p>
          )}
          {assistant.error && <ErrorState error={assistant.error} />}
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur lg:col-span-2">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Impact map</CardTitle></CardHeader>
        <CardContent>
          <GraphCanvas
            nodes={nodes}
            edges={edges}
            colorForType={colorForType}
            overlay={overlay}
            overlayMode="risk"
            selectedId={nodeId || null}
            onSelect={(n) => setNodeId(n?.id ?? "")}
            height={520}
            layout="force"
          />
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Dependency trace</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs">
          {!impacted.length ? <EmptyState label="Select a source organism and trace the cascade." /> : (
            <ul className="max-h-64 space-y-1 overflow-auto">
              {impacted.map((r, i) => (
                <li key={i} className="flex items-center justify-between gap-2 border-b py-1">
                  <span className="truncate">{String(r.label)}</span>
                  <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
                    hop {String(r.depth ?? r.hops ?? "-")}
                    <Badge variant={Number(r.risk ?? 0) > 0.6 ? "destructive" : "secondary"} className="text-[10px]">
                      {Number(r.risk ?? 0).toFixed(2)}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {(deps.data?.dependencies ?? []).length > 0 && (
            <ul className="max-h-52 space-y-1 overflow-auto border-t pt-2">
              {(deps.data?.dependencies ?? []).map((d, i) => {
                const x = d as Record<string, unknown>;
                return (
                  <li key={i} className="flex justify-between gap-2 border-b py-1">
                    <span className="truncate">{String(x.label)}</span>
                    <span className="text-muted-foreground">{String(x.relation ?? "depends on")}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
