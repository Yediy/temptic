import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";
import { useAuth } from "@/lib/auth";
import {
  useWorkforceBottlenecks, useEquipmentDependencies, useComplianceChains,
  useHighRiskProjects, useOrganizationalRisks,
} from "@/hooks/graph/use-graph";
import DomainGraph from "@/components/graph/DomainGraph";

function Panel({ title, q, children }: { title: string; q: { isLoading: boolean; error: unknown }; children: React.ReactNode }) {
  return (
    <Card className="bg-card/60 backdrop-blur">
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent>{q.isLoading ? <LoadingState /> : q.error ? <ErrorState error={q.error} /> : children}</CardContent>
    </Card>
  );
}

function Rows({ items, primary, secondary, badge }: {
  items: Array<Record<string, unknown>>;
  primary: (r: Record<string, unknown>) => string;
  secondary: (r: Record<string, unknown>) => string;
  badge?: (r: Record<string, unknown>) => string;
}) {
  if (!items.length) return <EmptyState label="Nothing detected yet — rebuild the graph." />;
  return (
    <ul className="max-h-64 space-y-1 overflow-auto text-sm">
      {items.map((r, i) => (
        <li key={i} className="flex items-center justify-between gap-2 border-b py-1">
          <span className="truncate">{primary(r)}</span>
          <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            {secondary(r)}
            {badge && <Badge variant="secondary" className="text-[10px]">{badge(r)}</Badge>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function DependencyGraph() {
  const { agencyId } = useAuth();
  const id = agencyId ?? undefined;
  const bottlenecks = useWorkforceBottlenecks(id);
  const equipment = useEquipmentDependencies(id);
  const compliance = useComplianceChains(id);
  const projects = useHighRiskProjects(id);
  const risks = useOrganizationalRisks(id);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <Panel title="Critical dependencies" q={bottlenecks}>
          <Rows items={bottlenecks.data?.bottlenecks ?? []}
            primary={(r) => String(r.label)}
            secondary={(r) => `supply ${r.supply} · demand ${r.demand}`}
            badge={(r) => String(r.severity)} />
        </Panel>
        <Panel title="Single points of failure" q={risks}>
          <Rows items={risks.data?.risks ?? []}
            primary={(r) => String(r.label)}
            secondary={(r) => `degree ${r.degree}`}
            badge={(r) => String(r.kind).replace(/_/g, " ")} />
        </Panel>
        <Panel title="Infrastructure & equipment" q={equipment}>
          <Rows items={equipment.data?.equipment ?? []}
            primary={(r) => String(r.label)}
            secondary={(r) => `${r.operators} operators · ${r.projects} projects`}
            badge={(r) => (r.single_operator_risk ? "single operator" : "ok")} />
        </Panel>
        <Panel title="Compliance chains" q={compliance}>
          <Rows items={(compliance.data?.chains ?? []).map((c) => {
            const rec = c as Record<string, unknown>;
            const cert = rec.certification as Record<string, unknown>;
            return { label: cert?.label, holders: rec.holders, downstream: (rec.downstream as unknown[])?.length ?? 0 };
          })}
            primary={(r) => String(r.label)}
            secondary={(r) => `${r.holders} holders · ${r.downstream} linked`} />
        </Panel>
        <Panel title="At-risk delivery" q={projects}>
          <Rows items={projects.data?.projects ?? []}
            primary={(r) => String(r.label)}
            secondary={(r) => `risk ${r.risk}`}
            badge={(r) => String(r.status || "unknown")} />
        </Panel>
      </div>

      <DomainGraph domainKey="project" />
    </div>
  );
}
