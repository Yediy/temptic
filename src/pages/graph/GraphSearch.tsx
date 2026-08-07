import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";
import { useAuth } from "@/lib/auth";
import {
  useSubgraph, useShortestPath, useSimilarWorkers, useRiskPropagation, useGraphNeighbors,
} from "@/hooks/graph/use-graph";
import { useReason } from "@/hooks/woic/use-cognitive";
import { Search } from "lucide-react";

type SearchKind =
  | "natural" | "semantic" | "relationship" | "shortest_path" | "similarity"
  | "dependency" | "impact" | "organization" | "worker" | "knowledge";

const KINDS: Array<{ key: SearchKind; label: string }> = [
  { key: "natural", label: "Natural language" },
  { key: "semantic", label: "Semantic" },
  { key: "relationship", label: "Relationship" },
  { key: "shortest_path", label: "Shortest path" },
  { key: "similarity", label: "Similarity" },
  { key: "dependency", label: "Dependency" },
  { key: "impact", label: "Impact" },
  { key: "organization", label: "Organization" },
  { key: "worker", label: "Worker" },
  { key: "knowledge", label: "Knowledge" },
];

const SCOPES: Partial<Record<SearchKind, string[]>> = {
  organization: ["agency", "client", "site", "organization", "location"],
  worker: ["worker", "candidate", "skill", "credential"],
  knowledge: ["knowledge", "document", "policy", "regulation", "training", "article"],
};

export default function GraphSearch() {
  const { agencyId } = useAuth();
  const sub = useSubgraph(agencyId ?? undefined, { limit: 800 });
  const [kind, setKind] = useState<SearchKind>("natural");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [answer, setAnswer] = useState("");

  const reason = useReason();
  const path = useShortestPath();
  const similar = useSimilarWorkers();
  const risk = useRiskPropagation();
  const nodes = sub.data?.nodes ?? [];
  const neighbors = useGraphNeighbors(agencyId ?? undefined, kind === "dependency" ? from : undefined, 2);

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    const scope = SCOPES[kind];
    return nodes.filter((n) =>
      (!scope || scope.some((s) => n.entity_type.toLowerCase().includes(s))) &&
      (!term || n.label.toLowerCase().includes(term) || n.entity_type.toLowerCase().includes(term)),
    ).slice(0, 60);
  }, [nodes, q, kind]);

  const run = () => {
    if (!agencyId) return;
    setAnswer("");
    if (kind === "shortest_path" && from && to) return void path.mutate({ agency_id: agencyId, from_id: from, to_id: to });
    if (kind === "similarity" && from) return void similar.mutate({ agency_id: agencyId, node_id: from });
    if (kind === "impact" && from) return void risk.mutate({ agency_id: agencyId, node_id: from });
    if (kind === "dependency") return;
    reason.mutate(
      { agency_id: agencyId, question: q, mode: kind, context: { surface: "graph_explorer" } },
      {
        onSuccess: (data) => {
          const d = data as Record<string, unknown>;
          setAnswer(String(d.answer ?? d.summary ?? d.explanation ?? JSON.stringify(d).slice(0, 1500)));
        },
        onError: (e) => setAnswer(e instanceof Error ? e.message : "Cognitive core unavailable."),
      },
    );
  };

  if (sub.isLoading) return <LoadingState label="Indexing platform graph…" />;
  if (sub.error) return <ErrorState error={sub.error} />;

  const nodePicker = (value: string, onChange: (v: string) => void, label: string) => (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-md border bg-background px-2 text-sm">
      <option value="">{label}</option>
      {nodes.map((n) => <option key={n.id} value={n.id}>{n.label} · {n.entity_type}</option>)}
    </select>
  );

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <Card className="bg-card/60 backdrop-blur lg:col-span-1">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Query</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {KINDS.map((k) => (
              <button key={k.key} type="button" onClick={() => setKind(k.key)}
                className={`rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
                  k.key === kind ? "border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {k.label}
              </button>
            ))}
          </div>
          <Input placeholder='e.g. "Every carpenter in Miami with OSHA 30"'
            value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()} />
          {(kind === "shortest_path" || kind === "similarity" || kind === "impact" || kind === "dependency") &&
            nodePicker(from, setFrom, "From / subject node")}
          {kind === "shortest_path" && nodePicker(to, setTo, "To node")}
          <Button size="sm" className="w-full" disabled={!agencyId} onClick={run}>
            <Search className="mr-1 h-3.5 w-3.5" /> Search
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur lg:col-span-2">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Results</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {reason.isPending && <LoadingState label="Reasoning over the graph…" />}
          {answer && <p className="whitespace-pre-wrap rounded-md border bg-muted/40 p-2 text-xs">{answer}</p>}

          {kind === "shortest_path" && path.data && (
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

          {kind === "similarity" && similar.data && (
            <ul className="space-y-1 text-sm">
              {similar.data.workers.map((w, i) => (
                <li key={i} className="flex justify-between border-b py-1">
                  <span className="truncate">{String((w as Record<string, unknown>).label)}</span>
                  <span className="text-xs text-muted-foreground">{String((w as Record<string, unknown>).similarity ?? 0)}</span>
                </li>
              ))}
            </ul>
          )}

          {kind === "impact" && risk.data && (
            <ul className="space-y-1 text-sm">
              {(risk.data.impacted ?? []).map((r, i) => (
                <li key={i} className="flex justify-between border-b py-1">
                  <span className="truncate">{String((r as Record<string, unknown>).label)}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    risk {Number((r as Record<string, unknown>).risk ?? 0).toFixed(2)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}

          {kind === "dependency" && (
            neighbors.isLoading ? <LoadingState /> : (
              <ul className="space-y-1 text-sm">
                {(neighbors.data?.neighbors ?? []).filter((n) => Number(n.depth) > 0).map((n) => (
                  <li key={String(n.node_id)} className="flex justify-between border-b py-1">
                    <span className="truncate">{String(n.label)}</span>
                    <span className="text-xs text-muted-foreground">{String(n.via ?? "")} · hop {String(n.depth)}</span>
                  </li>
                ))}
              </ul>
            )
          )}

          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              Matching organisms ({matches.length})
            </p>
            {matches.length === 0 ? <EmptyState label="No organisms match this query." /> : (
              <ul className="max-h-72 space-y-1 overflow-auto text-sm">
                {matches.map((n) => (
                  <li key={n.id} className="flex justify-between gap-2 border-b py-1">
                    <span className="truncate">{n.label}</span>
                    <Badge variant="outline" className="text-[10px]">{n.entity_type}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
