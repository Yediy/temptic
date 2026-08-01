import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState } from "@/components/woic/AsyncState";
import { useAuth } from "@/lib/auth";
import { useGraphTaxonomy } from "@/hooks/graph/use-graph";

export default function GraphTaxonomy() {
  const { agencyId } = useAuth();
  const q = useGraphTaxonomy(agencyId ?? undefined);
  if (q.isLoading) return <LoadingState />;
  if (q.error) return <ErrorState error={q.error} />;

  const nodeTypes = q.data?.node_types ?? [];
  const relationTypes = q.data?.relation_types ?? [];
  const categories = [...new Set(nodeTypes.map((n) => n.category))];

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Node taxonomy ({nodeTypes.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {categories.map((c) => (
            <div key={c}>
              <p className="mb-1 text-xs uppercase text-muted-foreground">{c}</p>
              <div className="flex flex-wrap gap-1">
                {nodeTypes.filter((n) => n.category === c).map((n) => (
                  <Badge key={n.key} variant="secondary">
                    <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: n.color ?? "#64748b" }} />
                    {n.label}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Relationship taxonomy ({relationTypes.length})</CardTitle></CardHeader>
        <CardContent>
          <ul className="max-h-[32rem] space-y-1 overflow-auto text-sm">
            {relationTypes.map((r) => (
              <li key={r.key} className="border-b py-1">
                <div className="font-medium">{r.label}</div>
                <div className="text-xs text-muted-foreground">
                  {(r.from_types ?? []).join(", ") || "any"} → {(r.to_types ?? []).join(", ") || "any"}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
