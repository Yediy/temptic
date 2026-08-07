import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { LoadingState, ErrorState } from "@/components/woic/AsyncState";
import { useAuth } from "@/lib/auth";
import {
  useSubgraph, useGraphTaxonomy, useOrganizationalRisks, useWorkforceBottlenecks,
  useGraphCommunities, useKnowledgeClusters, useGraphInfluence, useGraphSync,
} from "@/hooks/graph/use-graph";
import { PLATFORM_DOMAINS } from "@/lib/graph/platform";
import { RefreshCw } from "lucide-react";

function Metric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="bg-card/60 backdrop-blur">
      <CardContent className="p-4">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default function PlatformOverview() {
  const { agencyId } = useAuth();
  const id = agencyId ?? undefined;
  const sub = useSubgraph(id, { limit: 800 });
  const taxonomy = useGraphTaxonomy(id);
  const risks = useOrganizationalRisks(id);
  const bottlenecks = useWorkforceBottlenecks(id);
  const communities = useGraphCommunities(id);
  const clusters = useKnowledgeClusters(id);
  const influence = useGraphInfluence(id, undefined, 10);
  const sync = useGraphSync();

  const nodes = sub.data?.nodes ?? [];
  const edges = sub.data?.edges ?? [];

  const stats = useMemo(() => {
    const density = nodes.length ? edges.length / nodes.length : 0;
    const isolated = new Set(nodes.map((n) => n.id));
    for (const e of edges) { isolated.delete(e.from_id); isolated.delete(e.to_id); }
    const connectivity = nodes.length ? Math.round(((nodes.length - isolated.size) / nodes.length) * 100) : 0;
    const riskCount = risks.data?.risks?.length ?? 0;
    const health = Math.max(0, Math.min(100, Math.round(connectivity - riskCount * 2 + Math.min(density, 3) * 5)));
    return { density: density.toFixed(2), connectivity, isolated: isolated.size, health, riskCount };
  }, [nodes, edges, risks.data]);

  if (sub.isLoading) return <LoadingState label="Loading platform topology…" />;
  if (sub.error) return <ErrorState error={sub.error} />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Executive view of every Platform Organism and the relationships between them.
        </p>
        <Button size="sm" variant="outline" disabled={!agencyId || sync.isPending}
          onClick={() => agencyId && sync.mutate({ agency_id: agencyId })}>
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${sync.isPending ? "animate-spin" : ""}`} /> Rebuild graph
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Platform health" value={`${stats.health}`} hint="connectivity vs risk concentration" />
        <Metric label="Organisms" value={nodes.length} hint={`${edges.length} relationships`} />
        <Metric label="Knowledge connectivity" value={`${clusters.data?.clusters?.length ?? 0}`} hint="knowledge clusters detected" />
        <Metric label="Automation connectivity" value={`${communities.data?.communities?.length ?? 0}`} hint="linked communities" />
        <Metric label="Risk concentration" value={stats.riskCount} hint="organizational risks" />
        <Metric label="Critical dependencies" value={bottlenecks.data?.bottlenecks?.length ?? 0} hint="workforce bottlenecks" />
        <Metric label="Organizational health" value={`${stats.connectivity}%`} hint={`${stats.isolated} isolated organisms`} />
        <Metric label="Platform evolution" value={`${taxonomy.data?.node_types?.length ?? 0} / ${taxonomy.data?.relation_types?.length ?? 0}`} hint="node types / relation types" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Most influential organisms</CardTitle></CardHeader>
          <CardContent>
            {influence.isLoading ? <LoadingState /> : (
              <ul className="space-y-1 text-sm">
                {(influence.data?.results ?? []).map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 border-b py-1">
                    <span className="truncate">{String(r.label)}</span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      score {String(r.score ?? 0)}
                      <Badge variant="secondary" className="text-[10px]">{String(r.entity_type)}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Platform domains</CardTitle></CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {PLATFORM_DOMAINS.map((d) => (
              <Link key={d.key} to={`/graph/domain/${d.key}`}
                className="rounded-md border p-2 transition-colors hover:border-primary">
                <p className="text-sm font-medium">{d.label}</p>
                <p className="text-[11px] text-muted-foreground">{d.purpose}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
