import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EngineeringAssistant, Panel, RegistryState } from "@/components/architecture/ArchBits";
import { useRegistry, useRegistryList } from "@/hooks/architecture/use-architecture";
import { asArray, asRecord, str } from "@/lib/architecture/platform";

interface Edge { from: string; to: string; critical: boolean; kind: string }

export default function DependencyExplorer() {
  const graph = useRegistry<Record<string, unknown>>("dependencies.graph");
  const organisms = useRegistryList("organisms.list");
  const [selected, setSelected] = useState("");

  const record = asRecord(graph.data);
  const edges: Edge[] = useMemo(() => asArray(record.edges ?? record.dependencies).map((e) => ({
    from: str(e.from ?? e.source ?? e.dependent),
    to: str(e.to ?? e.target ?? e.dependency),
    critical: Boolean(e.critical),
    kind: str(e.kind ?? e.type),
  })).filter((e) => e.from && e.to), [record]);

  const nodes = useMemo(() => {
    const fromRegistry = asArray(record.nodes).map((n) => str(n.id ?? n.name)).filter(Boolean);
    if (fromRegistry.length) return fromRegistry;
    return Array.from(new Set(edges.flatMap((e) => [e.from, e.to])));
  }, [record, edges]);

  const upstream = edges.filter((e) => e.from === selected);
  const downstream = edges.filter((e) => e.to === selected);
  const cycles = asArray(record.circular_dependencies ?? record.cycles);
  const impactRadius = asArray(record.impact_radius).filter((r) => !selected || str(r.subject) === selected);
  const propagation = asArray(record.failure_propagation).filter((r) => !selected || str(r.subject) === selected);

  return (
    <div className="space-y-3">
      <Panel
        title="Dependency Explorer"
        description="Canonical dependency edges. No dependency is inferred by this console."
        actions={
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            aria-label="Select organism"
            className="h-8 rounded-md border bg-background px-2 text-xs"
          >
            <option value="">Select an organism…</option>
            {(nodes.length ? nodes : organisms.rows.map((o) => str(o.id ?? o.name))).filter(Boolean).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        }
      >
        <RegistryState status={graph.status} message={graph.message} label="the dependency graph">
          {edges.length === 0
            ? <p className="text-sm text-muted-foreground">The registry declares no dependency edges.</p>
            : !selected
              ? <p className="text-sm text-muted-foreground">{edges.length} edges across {nodes.length} organisms. Select an organism to inspect it.</p>
              : (
                <div className="grid gap-4 md:grid-cols-2">
                  <EdgeList title="Upstream dependencies" edges={upstream} field="to" empty="No upstream dependencies." />
                  <EdgeList title="Downstream dependents" edges={downstream} field="from" empty="No downstream dependents." />
                </div>
              )}
        </RegistryState>
      </Panel>

      <div className="grid gap-3 md:grid-cols-2">
        <Panel title="Circular Dependencies" tone={cycles.length ? "danger" : "default"}>
          <RegistryState status={graph.status} message={graph.message} label="cycle analysis">
            {cycles.length === 0
              ? <p className="text-sm text-muted-foreground">The registry reports no circular dependencies.</p>
              : (
                <ul className="space-y-1 text-sm">
                  {cycles.map((c, i) => (
                    <li key={i} className="font-mono text-xs text-red-400">
                      {Array.isArray(c.path) ? (c.path as unknown[]).map(String).join(" → ") : str(c.description)}
                    </li>
                  ))}
                </ul>
              )}
          </RegistryState>
        </Panel>

        <Panel title="Critical Dependencies">
          <RegistryState status={graph.status} message={graph.message} label="criticality">
            {edges.filter((e) => e.critical).length === 0
              ? <p className="text-sm text-muted-foreground">No edges are marked critical in the registry.</p>
              : (
                <ul className="space-y-1 text-sm">
                  {edges.filter((e) => e.critical).map((e, i) => (
                    <li key={i} className="font-mono text-xs">{e.from} → {e.to}</li>
                  ))}
                </ul>
              )}
          </RegistryState>
        </Panel>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Panel title="Change Impact Radius" description="Registry-computed radius for the selected subject.">
          {impactRadius.length === 0
            ? <p className="text-sm text-muted-foreground">The registry does not publish an impact radius for this selection.</p>
            : <ul className="space-y-1 text-sm">{impactRadius.map((r, i) => <li key={i}>{str(r.component ?? r.name)} — {str(r.effect)}</li>)}</ul>}
        </Panel>
        <Panel title="Failure Propagation" description="Declared propagation paths on failure.">
          {propagation.length === 0
            ? <p className="text-sm text-muted-foreground">The registry does not publish failure propagation for this selection.</p>
            : <ul className="space-y-1 text-sm">{propagation.map((r, i) => <li key={i}>{str(r.component ?? r.name)} — {str(r.effect ?? r.mode)}</li>)}</ul>}
        </Panel>
      </div>

      {selected && (
        <p className="text-xs text-muted-foreground">
          Open the full record: <Link to={`/architecture/organisms/${encodeURIComponent(selected)}`} className="text-primary hover:underline">{selected}</Link>
        </p>
      )}

      <EngineeringAssistant context={{ selected, edges: edges.slice(0, 200), cycles }} tasks={["explain_dependencies", "affected_components", "investigation_path"]} />
    </div>
  );
}

function EdgeList({ title, edges, field, empty }: { title: string; edges: Edge[]; field: "to" | "from"; empty: string }) {
  return (
    <div>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {edges.length === 0
        ? <p className="text-sm text-muted-foreground">{empty}</p>
        : (
          <ul className="space-y-1">
            {edges.map((e, i) => (
              <li key={i} className="flex items-center justify-between gap-2 border-b py-1 text-sm last:border-0">
                <Link to={`/architecture/organisms/${encodeURIComponent(e[field])}`} className="font-mono text-xs text-primary hover:underline">
                  {e[field]}
                </Link>
                <span className="text-[11px] uppercase text-muted-foreground">
                  {e.critical ? <span className="text-red-400">critical</span> : e.kind || "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
