import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";
import { useAuth } from "@/lib/auth";
import {
  useSubgraph, useShortestPath, useSimilarWorkers, useCareerPaths, useMissingSkills,
} from "@/hooks/graph/use-graph";

export default function GraphPaths() {
  const { agencyId } = useAuth();
  const sub = useSubgraph(agencyId ?? undefined, { limit: 500 });
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [worker, setWorker] = useState("");

  const path = useShortestPath();
  const similar = useSimilarWorkers();
  const career = useCareerPaths();
  const gaps = useMissingSkills();

  const nodes = sub.data?.nodes ?? [];
  const workers = nodes.filter((n) => n.entity_type === "worker");

  const select = (value: string, onChange: (v: string) => void, options: typeof nodes, label: string) => (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-md border bg-background px-2 text-sm">
      <option value="">{label}</option>
      {options.map((n) => <option key={n.id} value={n.id}>{n.label} · {n.entity_type}</option>)}
    </select>
  );

  if (sub.isLoading) return <LoadingState label="Loading graph nodes…" />;
  if (sub.error) return <ErrorState error={sub.error} />;
  if (!nodes.length) return <EmptyState label="No graph data yet — rebuild the graph from the Explorer tab." />;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Shortest relationship path</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {select(from, setFrom, nodes, "From node")}
          {select(to, setTo, nodes, "To node")}
          <Button size="sm" disabled={!from || !to || !agencyId || path.isPending}
            onClick={() => agencyId && path.mutate({ agency_id: agencyId, from_id: from, to_id: to })}>
            Find path
          </Button>
          {path.data && (
            path.data.connected ? (
              <ol className="space-y-1 text-sm">
                {path.data.path.map((h, i) => (
                  <li key={i} className="flex justify-between border-b py-1">
                    <span className="truncate">{String(h.label)}</span>
                    <span className="text-xs text-muted-foreground">{String(h.relation ?? "start")}</span>
                  </li>
                ))}
              </ol>
            ) : <EmptyState label="No path found within the search depth." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Worker intelligence</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {select(worker, setWorker, workers, "Select worker")}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={!worker || !agencyId}
              onClick={() => agencyId && similar.mutate({ agency_id: agencyId, node_id: worker })}>Similar workers</Button>
            <Button size="sm" variant="outline" disabled={!worker || !agencyId}
              onClick={() => agencyId && career.mutate({ agency_id: agencyId, node_id: worker })}>Career paths</Button>
            <Button size="sm" variant="outline" disabled={!worker || !agencyId}
              onClick={() => agencyId && gaps.mutate({ agency_id: agencyId, node_id: worker })}>Missing skills</Button>
          </div>
          {similar.data && (
            <ul className="space-y-1 text-sm">
              {similar.data.workers.map((w, i) => (
                <li key={i} className="flex justify-between border-b py-1">
                  <span className="truncate">{String(w.label)}</span>
                  <span className="text-xs text-muted-foreground">{String(w.similarity ?? 0)}</span>
                </li>
              ))}
            </ul>
          )}
          {gaps.data && (
            <div className="flex flex-wrap gap-1">
              {gaps.data.gaps.map((g, i) => (
                <Badge key={i} variant="secondary">{String(g.label)} · {String(g.demand)}</Badge>
              ))}
            </div>
          )}
          {career.data && (
            <ul className="space-y-1 text-sm">
              {career.data.paths.map((p, i) => {
                const peer = (p as Record<string, unknown>).peer as Record<string, unknown>;
                const steps = ((p as Record<string, unknown>).next_steps as Array<Record<string, unknown>>) ?? [];
                return (
                  <li key={i} className="border-b py-1">
                    <div className="font-medium">{String(peer?.label)}</div>
                    <div className="text-xs text-muted-foreground">
                      {steps.map((s) => String(s.label)).slice(0, 6).join(" · ")}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
