import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";
import { useAuth } from "@/lib/auth";
import {
  useOrganizationalRisks, useWorkforceBottlenecks, useHiddenExperts, useHighRiskProjects,
  useEquipmentDependencies, useComplianceChains, useKnowledgeClusters, useSuccessPatterns,
  useGraphInfluence,
} from "@/hooks/graph/use-graph";

type Q = { isLoading: boolean; error: unknown; data?: unknown };

function Panel({ title, q, render }: { title: string; q: Q; render: () => React.ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        {q.isLoading ? <LoadingState /> : q.error ? <ErrorState error={q.error} /> : render()}
      </CardContent>
    </Card>
  );
}

function Rows({ items, primary, secondary, badge }: {
  items: Array<Record<string, unknown>>;
  primary: (r: Record<string, unknown>) => string;
  secondary: (r: Record<string, unknown>) => string;
  badge?: (r: Record<string, unknown>) => string;
}) {
  if (!items.length) return <EmptyState label="Nothing detected yet — rebuild the graph from the Explorer tab." />;
  return (
    <ul className="max-h-72 space-y-1 overflow-auto text-sm">
      {items.map((r, i) => (
        <li key={i} className="flex items-center justify-between gap-2 border-b py-1">
          <span className="truncate">{primary(r)}</span>
          <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            {secondary(r)}
            {badge && <Badge variant="secondary">{badge(r)}</Badge>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function GraphIntelligence() {
  const { agencyId } = useAuth();
  const id = agencyId ?? undefined;
  const risks = useOrganizationalRisks(id);
  const bottlenecks = useWorkforceBottlenecks(id);
  const experts = useHiddenExperts(id);
  const projects = useHighRiskProjects(id);
  const equipment = useEquipmentDependencies(id);
  const compliance = useComplianceChains(id);
  const clusters = useKnowledgeClusters(id);
  const patterns = useSuccessPatterns(id);
  const influence = useGraphInfluence(id, undefined, 20);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title="Organizational risks" q={risks} render={() => (
        <Rows items={risks.data?.risks ?? []}
          primary={(r) => String(r.label)}
          secondary={(r) => `degree ${r.degree}`}
          badge={(r) => String(r.kind).replace(/_/g, " ")} />
      )} />
      <Panel title="Workforce bottlenecks" q={bottlenecks} render={() => (
        <Rows items={bottlenecks.data?.bottlenecks ?? []}
          primary={(r) => String(r.label)}
          secondary={(r) => `supply ${r.supply} · demand ${r.demand}`}
          badge={(r) => String(r.severity)} />
      )} />
      <Panel title="Hidden experts" q={experts} render={() => (
        <Rows items={experts.data?.experts ?? []}
          primary={(r) => String(r.label)}
          secondary={(r) => `${r.assignments} assignments · degree ${r.degree}`} />
      )} />
      <Panel title="High risk projects" q={projects} render={() => (
        <Rows items={projects.data?.projects ?? []}
          primary={(r) => String(r.label)}
          secondary={(r) => `risk ${r.risk}`}
          badge={(r) => String(r.status || "unknown")} />
      )} />
      <Panel title="Equipment dependencies" q={equipment} render={() => (
        <Rows items={equipment.data?.equipment ?? []}
          primary={(r) => String(r.label)}
          secondary={(r) => `${r.operators} operators · ${r.projects} projects`}
          badge={(r) => (r.single_operator_risk ? "single operator" : "ok")} />
      )} />
      <Panel title="Compliance chains" q={compliance} render={() => (
        <Rows items={(compliance.data?.chains ?? []).map((c) => {
          const rec = c as Record<string, unknown>;
          const cert = rec.certification as Record<string, unknown>;
          return { label: cert?.label, holders: rec.holders, downstream: (rec.downstream as unknown[])?.length ?? 0 };
        })}
          primary={(r) => String(r.label)}
          secondary={(r) => `${r.holders} holders · ${r.downstream} linked`} />
      )} />
      <Panel title="Knowledge clusters" q={clusters} render={() => (
        <Rows items={clusters.data?.clusters ?? []}
          primary={(r) => String(r.community_label ?? "Cluster")}
          secondary={(r) => `${r.size} members`} />
      )} />
      <Panel title="Success patterns" q={patterns} render={() => (
        <Rows items={patterns.data?.patterns ?? []}
          primary={(r) => String(r.label)}
          secondary={(r) => `${r.successful_assignments} completed`} />
      )} />
      <Panel title="Most influential nodes" q={influence} render={() => (
        <Rows items={influence.data?.results ?? []}
          primary={(r) => String(r.label)}
          secondary={(r) => `score ${r.score ?? 0}`}
          badge={(r) => String(r.entity_type)} />
      )} />
    </div>
  );
}
