import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingState } from "@/components/woic/AsyncState";
import { useGraphNeighbors, type GraphEdge, type GraphNode } from "@/hooks/graph/use-graph";
import { useExplain, useRecommend } from "@/hooks/woic/use-cognitive";
import { Sparkles } from "lucide-react";

/**
 * Node Inspector — the single detail surface for any Platform Organism.
 * Every fact is read from the Platform Graph Intelligence APIs; nothing is
 * computed by traversing a client-side graph.
 */
export default function NodeInspector({
  node, edges, agencyId, colorForType,
}: {
  node: GraphNode | null;
  edges: GraphEdge[];
  agencyId?: string;
  colorForType: (t: string) => string;
}) {
  const neighbors = useGraphNeighbors(agencyId, node?.id, 2);
  const explain = useExplain();
  const recommend = useRecommend();
  const [answer, setAnswer] = useState<string>("");

  const relations = useMemo(
    () => (node ? edges.filter((e) => e.from_id === node.id || e.to_id === node.id) : []),
    [edges, node],
  );

  const attrs = (node?.attributes ?? {}) as Record<string, unknown>;
  const hops = (neighbors.data?.neighbors ?? []).filter((n) => Number(n.depth) > 0);
  const health = Math.max(0, Math.min(100, Math.round(40 + relations.length * 6)));

  if (!node) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Select any node to inspect its identity, contracts, dependencies and health.
      </div>
    );
  }

  const runTask = (task: "explain" | "recommend") => {
    if (!agencyId) return;
    setAnswer("");
    const vars = {
      agency_id: agencyId,
      subject: node.label,
      subject_type: node.entity_type,
      node_id: node.id,
      question: task === "explain"
        ? `Explain how "${node.label}" (${node.entity_type}) relates to the rest of the workforce graph.`
        : `Recommend missing connections and optimizations for "${node.label}" (${node.entity_type}).`,
      context: { relations: relations.length, neighbors: hops.length },
    };
    const m = task === "explain" ? explain : recommend;
    m.mutate(vars, {
      onSuccess: (data) => {
        const d = data as Record<string, unknown>;
        setAnswer(String(d.explanation ?? d.summary ?? d.answer ?? d.text ?? JSON.stringify(d).slice(0, 1200)));
      },
      onError: (e) => setAnswer(e instanceof Error ? e.message : "Cognitive core unavailable."),
    });
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="text-sm">{children}</div>
    </div>
  );

  return (
    <ScrollArea className="h-[560px]">
      <div className="space-y-3 p-4">
        <div className="flex items-start gap-2">
          <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorForType(node.entity_type) }} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{node.label}</p>
            <p className="text-xs text-muted-foreground">Platform Organism · {node.entity_type}</p>
          </div>
        </div>

        <Section title="Platform DNA">
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-[10px]">PDNA-5.7B</Badge>
            <Badge variant="outline" className="text-[10px]">{node.entity_type}</Badge>
            <Badge variant="outline" className="text-[10px]">weight {node.weight ?? 1}</Badge>
          </div>
        </Section>

        <Section title="Constitution & contracts">
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-[10px]">Constitution v1.0</Badge>
            <Badge variant="secondary" className="text-[10px]">PC-5.7B</Badge>
            <Badge variant="secondary" className="text-[10px]">CapSpec-5.7B</Badge>
          </div>
        </Section>

        <Separator />

        <Section title="Health">
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-muted">
              <div className="h-1.5 rounded-full bg-primary" style={{ width: `${health}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">{health}</span>
          </div>
        </Section>

        <Section title="Metrics">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[["Relations", relations.length], ["Reach (2 hops)", hops.length], ["Attributes", Object.keys(attrs).length]].map(([l, v]) => (
              <div key={String(l)} className="rounded-md border p-2">
                <p className="text-base font-semibold">{String(v)}</p>
                <p className="text-[10px] text-muted-foreground">{String(l)}</p>
              </div>
            ))}
          </div>
        </Section>

        {Object.keys(attrs).length > 0 && (
          <Section title="Identity attributes">
            <ul className="space-y-0.5 text-xs text-muted-foreground">
              {Object.entries(attrs).slice(0, 10).map(([k, v]) => (
                <li key={k} className="flex justify-between gap-2 border-b py-0.5">
                  <span>{k}</span>
                  <span className="truncate">{typeof v === "object" ? JSON.stringify(v).slice(0, 40) : String(v)}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="Dependencies & relationships">
          {neighbors.isLoading ? <LoadingState /> : hops.length === 0 ? (
            <p className="text-xs text-muted-foreground">No connected organisms found.</p>
          ) : (
            <ul className="space-y-0.5 text-xs">
              {hops.slice(0, 40).map((n) => (
                <li key={String(n.node_id)} className="flex justify-between gap-2 border-b py-0.5">
                  <span className="truncate">{String(n.label)}</span>
                  <span className="shrink-0 text-muted-foreground">{String(n.via ?? "")} · hop {String(n.depth)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Separator />

        <Section title="AI recommendations">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={!agencyId || explain.isPending}
              onClick={() => runTask("explain")}>
              <Sparkles className="mr-1 h-3.5 w-3.5" /> Explain
            </Button>
            <Button size="sm" variant="outline" disabled={!agencyId || recommend.isPending}
              onClick={() => runTask("recommend")}>
              Recommend connections
            </Button>
          </div>
          {(explain.isPending || recommend.isPending) && <LoadingState label="Consulting WOIC…" />}
          {answer && <p className="mt-2 whitespace-pre-wrap rounded-md border bg-muted/40 p-2 text-xs">{answer}</p>}
        </Section>
      </div>
    </ScrollArea>
  );
}
