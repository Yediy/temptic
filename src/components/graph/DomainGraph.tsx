import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";
import GraphCanvas from "@/components/graph/GraphCanvas";
import NodeInspector from "@/components/graph/NodeInspector";
import { useAuth } from "@/lib/auth";
import {
  useGraphTaxonomy, useSubgraph, useGraphSync, useRiskPropagation, type GraphNode,
} from "@/hooks/graph/use-graph";
import {
  DEFAULT_SETTINGS, PLATFORM_DOMAINS, SAVED_VIEWS_KEY, SETTINGS_KEY, VISUALIZATION_MODES,
  domainByKey, entityTypesForDomain, modeByKey, readJson, writeJson, type SavedGraphView,
} from "@/lib/graph/platform";
import { RefreshCw, Save } from "lucide-react";

/**
 * Reusable domain graph workspace. Every domain page renders this with a
 * different scope — the projection, traversal and analytics all come from the
 * Platform Graph Intelligence APIs (`woic-graph`).
 */
export default function DomainGraph({ domainKey }: { domainKey: string }) {
  const { agencyId } = useAuth();
  const domain = domainByKey(domainKey);
  const settings = readJson(SETTINGS_KEY, DEFAULT_SETTINGS);

  const [modeKey, setModeKey] = useState(domain.defaultMode ?? settings.defaultMode);
  const [asOf, setAsOf] = useState("");
  const [manualTypes, setManualTypes] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [viewName, setViewName] = useState("");

  const mode = modeByKey(modeKey);
  const taxonomy = useGraphTaxonomy(agencyId ?? undefined);
  const nodeTypes = taxonomy.data?.node_types ?? [];
  const domainTypes = useMemo(() => entityTypesForDomain(domain, nodeTypes), [domain, nodeTypes]);
  const activeTypes = manualTypes ?? domainTypes;

  const sub = useSubgraph(agencyId ?? undefined, {
    entity_types: activeTypes,
    as_of: asOf ? new Date(asOf).toISOString() : null,
    limit: settings.nodeLimit,
  });
  const sync = useGraphSync();
  const risk = useRiskPropagation();

  const colorMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of nodeTypes) m.set(t.key, t.color ?? "#64748b");
    return m;
  }, [nodeTypes]);
  const colorForType = (t: string) => colorMap.get(t) ?? "#64748b";

  const overlay = useMemo(() => {
    const out: Record<string, number> = {};
    if (mode.overlay === "none") return out;
    if (mode.overlay === "risk") {
      for (const r of (risk.data?.impacted ?? []) as Array<Record<string, unknown>>) {
        out[String(r.node_id)] = Number(r.risk ?? 0);
      }
      return out;
    }
    const degrees = new Map<string, number>();
    for (const e of sub.data?.edges ?? []) {
      degrees.set(e.from_id, (degrees.get(e.from_id) ?? 0) + 1);
      degrees.set(e.to_id, (degrees.get(e.to_id) ?? 0) + 1);
    }
    const max = Math.max(1, ...degrees.values());
    for (const [id, d] of degrees) out[id] = d / max;
    return out;
  }, [mode.overlay, risk.data, sub.data]);

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const n of sub.data?.nodes ?? []) c.set(n.entity_type, (c.get(n.entity_type) ?? 0) + 1);
    return c;
  }, [sub.data]);

  const saveView = () => {
    const views = readJson<SavedGraphView[]>(SAVED_VIEWS_KEY, []) as unknown as SavedGraphView[];
    const list = Array.isArray(views) ? views : [];
    list.unshift({
      id: crypto.randomUUID(),
      name: viewName || `${domain.label} · ${mode.label}`,
      domain: domain.key, mode: mode.key, types: activeTypes ?? [], asOf,
      createdAt: new Date().toISOString(),
    });
    writeJson(SAVED_VIEWS_KEY, list.slice(0, 40));
    setViewName("");
  };

  return (
    <div className="space-y-3">
      <Card className="bg-card/60 backdrop-blur">
        <CardContent className="space-y-3 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{domain.label}</p>
              <p className="text-xs text-muted-foreground">{domain.purpose}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input type="date" aria-label="Time travel date" className="h-8 w-36"
                value={asOf} onChange={(e) => setAsOf(e.target.value)} />
              <Input className="h-8 w-40" placeholder="Save view as…" value={viewName}
                onChange={(e) => setViewName(e.target.value)} />
              <Button size="sm" variant="outline" onClick={saveView}>
                <Save className="mr-1 h-3.5 w-3.5" /> Save
              </Button>
              <Button size="sm" variant="outline" disabled={!agencyId || sync.isPending}
                onClick={() => agencyId && sync.mutate({ agency_id: agencyId })}>
                <RefreshCw className={`mr-1 h-3.5 w-3.5 ${sync.isPending ? "animate-spin" : ""}`} />
                Rebuild
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {VISUALIZATION_MODES.map((m) => (
              <button key={m.key} type="button" title={m.hint}
                onClick={() => {
                  setModeKey(m.key);
                  if (m.overlay === "risk" && selected && agencyId) risk.mutate({ agency_id: agencyId, node_id: selected.id });
                }}
                className={`rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
                  m.key === modeKey ? "border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1">
            {nodeTypes.map((t) => {
              const active = (activeTypes ?? []).includes(t.key);
              const count = counts.get(t.key) ?? 0;
              return (
                <button key={t.key} type="button"
                  onClick={() => setManualTypes((prev) => {
                    const base = prev ?? domainTypes ?? [];
                    return base.includes(t.key) ? base.filter((x) => x !== t.key) : [...base, t.key];
                  })}
                  className={`rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
                    active ? "border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  <span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: t.color ?? "#64748b" }} />
                  {t.label}{count ? ` (${count})` : ""}
                </button>
              );
            })}
            {manualTypes && (
              <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => setManualTypes(null)}>
                Reset scope
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-4">
        <Card className="bg-card/60 backdrop-blur lg:col-span-3">
          <CardContent className="p-3">
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-[10px]">{mode.label}</Badge>
              {sub.data && <span>{sub.data.nodes.length} organisms · {sub.data.edges.length} relationships</span>}
            </div>
            {sub.isLoading ? <LoadingState label="Projecting platform graph…" /> :
             sub.error ? <ErrorState error={sub.error} /> :
             !sub.data?.nodes.length ? (
               <EmptyState label="No graph data in this domain yet — run “Rebuild” to project your records." />
             ) : (
              <GraphCanvas
                nodes={sub.data.nodes}
                edges={sub.data.edges}
                colorForType={colorForType}
                overlay={overlay}
                overlayMode={mode.overlay}
                layout={mode.layout}
                selectedId={selected?.id ?? null}
                onSelect={(n) => {
                  setSelected(n);
                  if (n && mode.overlay === "risk" && agencyId) risk.mutate({ agency_id: agencyId, node_id: n.id });
                }}
                height={560}
              />
             )}
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur">
          <CardContent className="p-0">
            <NodeInspector node={selected} edges={sub.data?.edges ?? []}
              agencyId={agencyId ?? undefined} colorForType={colorForType} />
          </CardContent>
        </Card>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Domains available: {PLATFORM_DOMAINS.map((d) => d.label.replace(" Graph", "")).join(" · ")}
      </p>
    </div>
  );
}
