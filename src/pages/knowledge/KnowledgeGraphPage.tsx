import { useMemo, useState } from "react";
import GraphCanvas from "@/components/graph/GraphCanvas";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import {
  knowledgeNodeColor,
  useKnowledgeArticles,
  useKnowledgeGraph,
} from "@/hooks/knowledge/use-knowledge";
import type { GraphNode } from "@/hooks/graph/use-graph";

export default function KnowledgeGraphPage() {
  const { agencyId } = useAuth();
  const { data: articles = [], isLoading } = useKnowledgeArticles(agencyId ?? undefined);
  const { nodes, edges } = useKnowledgeGraph(articles);
  const [selected, setSelected] = useState<GraphNode | null>(null);

  const legend = useMemo(() => [...new Set(nodes.map((n) => n.entity_type))], [nodes]);

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      <Card className="bg-card/60 backdrop-blur lg:col-span-3">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Knowledge relationships</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Projecting knowledge graph…</p>
          ) : nodes.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No knowledge available to project.</p>
          ) : (
            <GraphCanvas
              nodes={nodes}
              edges={edges}
              colorForType={knowledgeNodeColor}
              selectedId={selected?.id ?? null}
              onSelect={setSelected}
              height={560}
            />
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Legend</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {legend.map((t) => (
              <Badge key={t} variant="outline" className="text-[10px]" style={{ borderColor: knowledgeNodeColor(t) }}>
                {t}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Selection</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {selected ? (
              <>
                <p className="font-medium">{selected.label}</p>
                <p className="text-xs text-muted-foreground">{selected.entity_type}</p>
                <p className="text-xs text-muted-foreground">
                  {edges.filter((e) => e.from_id === selected.id || e.to_id === selected.id).length} relations
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">Select a node to inspect its relations.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Workforce Graph</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Documents, policies, workers, projects, skills, training, certifications, regulations and organizations
            are unified in the Global Workforce Graph. This projection reuses the same canvas and node contract.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
