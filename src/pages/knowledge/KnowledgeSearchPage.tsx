import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Search as SearchIcon, Sparkles, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  filterArticles,
  useKnowledgeArticles,
  useKnowledgeWorkspaceState,
  useSemanticKnowledgeSearch,
} from "@/hooks/knowledge/use-knowledge";
import { SEARCH_MODES, STATUS_TONE, type SearchMode } from "@/lib/knowledge/taxonomy";
import { fmtDate } from "@/components/woic/DataPanel";

export default function KnowledgeSearch() {
  const { agencyId } = useAuth();
  const [mode, setMode] = useState<SearchMode>("natural");
  const [q, setQ] = useState("");
  const { data: articles = [] } = useKnowledgeArticles(agencyId ?? undefined);
  const ws = useKnowledgeWorkspaceState();
  const semantic = useSemanticKnowledgeSearch();

  const structural = useMemo(() => {
    if (!q.trim()) return [];
    const base = filterArticles(articles, { q });
    if (mode === "policy") return base.filter((a) => a.kind === "policy" || a.kind === "regulation");
    if (mode === "document") return base.filter((a) => a.kind === "document");
    if (mode === "worker") return base.filter((a) => (a.tags ?? []).some((t) => /worker|role|crew/i.test(t)));
    if (mode === "organization") return base.filter((a) => (a.tags ?? []).some((t) => /client|org|site/i.test(t)));
    return base;
  }, [articles, q, mode]);

  const runCognitive = () => {
    if (!agencyId || !q.trim()) return;
    semantic.mutate({ agency_id: agencyId, query: q.trim(), mode });
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card/60 backdrop-blur">
        <CardContent className="space-y-3 pt-5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runCognitive()}
                placeholder="Ask anything about your organization's knowledge…"
                className="pl-9"
              />
            </div>
            <Button onClick={runCognitive} disabled={!q.trim() || semantic.isPending}>
              {semantic.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
              Ask WOIC
            </Button>
            <Button variant="outline" disabled={!q.trim()} onClick={() => ws.saveSearch(q.trim(), q.trim(), mode)}>
              Save
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SEARCH_MODES.map((m) => (
              <Button
                key={m.key}
                size="sm"
                variant={mode === m.key ? "default" : "outline"}
                onClick={() => setMode(m.key)}
                title={m.hint}
              >
                {m.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 bg-card/60 backdrop-blur">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Matching knowledge ({structural.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {structural.length === 0 && <p className="text-sm text-muted-foreground">Enter a query to search the corpus.</p>}
            {structural.slice(0, 40).map((a) => (
              <div key={a.id} className="rounded-lg border px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="line-clamp-1 text-sm font-medium">{a.title}</span>
                  <Badge variant={STATUS_TONE[a.status] ?? "outline"} className="text-[10px]">{a.status}</Badge>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{a.body?.slice(0, 200)}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{a.kind} · v{a.version} · {fmtDate(a.updated_at)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-card/60 backdrop-blur">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Cognitive answer</CardTitle></CardHeader>
            <CardContent className="text-sm">
              {semantic.isPending && <p className="text-muted-foreground">Retrieving from cognitive memory…</p>}
              {semantic.error && <p className="text-destructive">{(semantic.error as Error).message}</p>}
              {semantic.data ? (
                <p className="whitespace-pre-wrap">{semantic.data.text}</p>
              ) : (
                !semantic.isPending && <p className="text-muted-foreground">Ask WOIC to retrieve semantically related knowledge.</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Saved searches</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              {ws.savedSearches.length === 0 && <p className="text-sm text-muted-foreground">No saved searches.</p>}
              {ws.savedSearches.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
                  <button className="line-clamp-1 hover:underline" onClick={() => { setQ(s.query); setMode(s.mode); }}>
                    {s.label}
                  </button>
                  <Button size="icon" variant="ghost" onClick={() => ws.removeSearch(s.id)} aria-label="Remove saved search">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
