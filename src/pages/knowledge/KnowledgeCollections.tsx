import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useKnowledgeArticles, useKnowledgeWorkspaceState } from "@/hooks/knowledge/use-knowledge";
import { COLLECTION_PRESETS } from "@/lib/knowledge/taxonomy";

export default function KnowledgeCollections() {
  const { agencyId } = useAuth();
  const { data: articles = [] } = useKnowledgeArticles(agencyId ?? undefined);
  const ws = useKnowledgeWorkspaceState();
  const [name, setName] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = ws.collections.find((c) => c.id === activeId) ?? null;
  const byId = useMemo(() => new Map(articles.map((a) => [a.id, a])), [articles]);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Collections</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New collection name" />
            <Button
              size="sm"
              disabled={!name.trim()}
              onClick={() => { ws.createCollection(name.trim()); setName(""); }}
            >
              Create
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {COLLECTION_PRESETS.map((p) => (
              <Button key={p.key} size="sm" variant="outline" onClick={() => ws.createCollection(`${p.label} Collection`)}>
                + {p.label}
              </Button>
            ))}
          </div>
          <div className="space-y-1.5">
            {ws.collections.length === 0 && <p className="text-sm text-muted-foreground">No collections yet.</p>}
            {ws.collections.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2">
                <button
                  className={`flex-1 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/50 ${activeId === c.id ? "bg-muted" : ""}`}
                  onClick={() => setActiveId(c.id)}
                >
                  {c.name} <span className="text-xs text-muted-foreground">({c.articleIds.length})</span>
                </button>
                <Button size="icon" variant="ghost" onClick={() => ws.removeCollection(c.id)} aria-label="Delete collection">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{active ? `Curate — ${active.name}` : "Curate collection"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!active && <p className="text-sm text-muted-foreground">Select a collection to add knowledge.</p>}
          {active && articles.map((a) => {
            const inside = active.articleIds.includes(a.id);
            return (
              <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-medium">{a.title}</p>
                  <p className="text-[10px] text-muted-foreground">{a.kind} · {a.status}</p>
                </div>
                <Button size="sm" variant={inside ? "default" : "outline"} onClick={() => ws.toggleInCollection(active.id, a.id)}>
                  {inside ? "Added" : "Add"}
                </Button>
              </div>
            );
          })}
          {active && active.articleIds.length > 0 && (
            <div className="pt-2">
              <p className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">In collection</p>
              <div className="flex flex-wrap gap-1.5">
                {active.articleIds.map((id) => (
                  <Badge key={id} variant="secondary" className="text-[10px]">{byId.get(id)?.title ?? id}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
