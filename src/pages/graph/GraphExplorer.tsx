import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";
import GraphCanvas from "@/components/graph/GraphCanvas";
import { useAuth } from "@/lib/auth";
import {
  useGraphTaxonomy, useSubgraph, useGraphSync, useGraphNeighbors, useRiskPropagation,
  type GraphNode,
} from "@/hooks/graph/use-graph";
import { RefreshCw } from "lucide-react";

export default function GraphExplorer() {
  const { agencyId } = useAuth();
  const [types, setTypes] = useState<string[]>([]);
  const [asOf, setAsOf] = useState<string>("");
  const [overlayMode, setOverlayMode] = useState<"none" | "heat" | "risk">("none");
  const [selected, setSelected] = useState<GraphNode | null>(null);

  const taxonomy = useGraphTaxonomy(agencyId ?? undefined);
  const sub = useSubgraph(agencyId ?? undefined, {
    entity_types: types.length ? types : undefined,
    as_of: asOf ? new Date(asOf).toISOString() : null,
    limit: 500,
  });
  const sync = useGraphSync();
  const neighbors = useGraphNeighbors(agencyId ?? undefined, selected?.id, 2);
  const risk = useRiskPropagation();

  const colorMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of taxonomy.data?.node_types ?? []) m.set(t.key, t.color ?? "#64748b");
    return m;
  }, [taxonomy.data]);

  const overlay = useMemo(() => {
    if (overlayMode === "none") return {};
    const out: Record<string, number> = {};
    if (overlayMode === "risk") {
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
  }, [overlayMode, risk.data, sub.data]);

  const nodeCounts = useMemo(() => {
    const c = new Map<string, number>();
    for (const n of sub.data?.nodes ?? []) c.set(n.entity_type, (c.get(n.entity_type) ?? 0) + 1);
    return c;
  }, [sub.data]);

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            {sub.data ? `${sub.data.nodes.length} nodes · ${sub.data.edges.length} relationships` : "Graph view"}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              className="h-8 w-40"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
              aria-label="Time travel date"
            />
            {(["none", "heat", "risk"] as const).map((m) => (
              <Button key={m} size="sm" variant={overlayMode === m ? "default" : "outline"}
                onClick={() => {
                  setOverlayMode(m);
                  if (m === "risk" && selected && agencyId) risk.mutate({ agency_id: agencyId, node_id: selected.id });
                }}>
                {m === "none" ? "No overlay" : m === "heat" ? "Heat map" : "Risk overlay"}
              </Button>
            ))}
            <Button size="sm" variant="outline" disabled={!agencyId || sync.isPending}
              onClick={() => agencyId && sync.mutate({ agency_id: agencyId })}>
              <RefreshCw className={`mr-1 h-3.5 w-3.5 ${sync.isPending ? "animate-spin" : ""}`} />
              Rebuild graph
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {(taxonomy.data?.node_types ?? []).map((t) => {
              const active = types.includes(t.key);
              const count = nodeCounts.get(t.key) ?? 0;
              return (
                <button key={t.key} type="button"
                  onClick={() => setTypes((prev) => active ? prev.filter((x) => x !== t.key) : [...prev, t.key])}
                  className={`rounded-full border px-2 py-0.5 text-[11px] transition-colors ${active ? "border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  <span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: t.color ?? "#64748b" }} />
                  {t.label}{count ? ` (${count})` : ""}
                </button>
              );
            })}
          </div>

          {sub.isLoading ? <LoadingState label="Building graph view…" /> :
           sub.error ? <ErrorState error={sub.error} /> :
           !sub.data?.nodes.length ? <EmptyState label="No graph data yet — run “Rebuild graph” to project your records into the graph." /> : (
            <GraphCanvas
              nodes={sub.data.nodes}
              edges={sub.data.edges}
              colorForType={(t) => colorMap.get(t) ?? "#64748b"}
              overlay={overlay}
              overlayMode={overlayMode}
              selectedId={selected?.id ?? null}
              onSelect={(n) => {
                setSelected(n);
                if (n && overlayMode === "risk" && agencyId) risk.mutate({ agency_id: agencyId, node_id: n.id });
              }}
            />
           )}
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader><CardTitle className="text-base">{selected.label}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Badge variant="secondary">{selected.entity_type}</Badge>
            {neighbors.isLoading ? <LoadingState /> : (
              <ul className="max-h-64 space-y-1 overflow-auto">
                {(neighbors.data?.neighbors ?? []).filter((n) => Number(n.depth) > 0).map((n) => (
                  <li key={String(n.node_id)} className="flex justify-between border-b py-1">
                    <span className="truncate">{String(n.label)}</span>
                    <span className="text-xs text-muted-foreground">
                      {String(n.via ?? "")} · {String(n.entity_type)} · hop {String(n.depth)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
