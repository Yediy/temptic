import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState, EmptyState, ErrorState } from "@/components/woic/AsyncState";
import { useAuth } from "@/lib/auth";
import { useKnowledgeGraph } from "@/hooks/use-twin";

export default function TwinKnowledgeGraph() {
  const { agencyId } = useAuth();
  const q = useKnowledgeGraph(agencyId ?? undefined);
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Nodes</CardTitle></CardHeader>
        <CardContent>
          {q.isLoading ? <LoadingState /> :
           q.error ? <ErrorState error={q.error} /> :
           !q.data?.nodes.length ? <EmptyState label="No knowledge nodes yet." /> : (
            <div className="flex flex-wrap gap-2">
              {q.data.nodes.map((n: any) => (
                <Badge key={n.id} variant="secondary" title={n.node_type}>
                  <span className="mr-1 text-[10px] uppercase text-muted-foreground">{n.node_type}</span>
                  {n.label}
                </Badge>
              ))}
            </div>
           )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Edges</CardTitle></CardHeader>
        <CardContent>
          {q.data && q.data.edges.length > 0 ? (
            <ul className="max-h-96 overflow-auto text-sm">
              {q.data.edges.map((e: any) => (
                <li key={e.id} className="flex justify-between border-b py-1">
                  <span className="truncate">{e.from_node.slice(0, 8)} → {e.to_node.slice(0, 8)}</span>
                  <span className="text-xs text-muted-foreground">{e.relationship}{typeof e.weight === "number" ? ` · ${e.weight}` : ""}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState label="No relationships mapped yet." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
