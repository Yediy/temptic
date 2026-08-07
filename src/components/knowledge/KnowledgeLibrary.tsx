import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { Bookmark, BookmarkCheck, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  filterArticles,
  useArticleVersions,
  useKnowledgeArticles,
  useKnowledgeAssistant,
  useKnowledgeWorkspaceState,
  useSetArticleStatus,
  type KnowledgeArticle,
} from "@/hooks/knowledge/use-knowledge";
import {
  ASSISTANT_TASKS,
  KIND_BY_KEY,
  KNOWLEDGE_STATUSES,
  STATUS_TONE,
  type KnowledgeKind,
} from "@/lib/knowledge/taxonomy";
import { fmtDate } from "@/components/woic/DataPanel";

interface Props {
  kind: KnowledgeKind;
  title?: string;
  description?: string;
  /** Restrict to a fixed set of article ids (used by collections/approvals). */
  onlyIds?: string[];
  /** Restrict to a status subset. */
  statuses?: string[];
}

/**
 * The Knowledge Library surface: list + professional viewer + AI assistant.
 * Purely presentational — data comes from the Knowledge Intelligence Engine
 * and every AI action is delegated to the WOIC cognitive core.
 */
export default function KnowledgeLibrary({ kind, title, description, onlyIds, statuses }: Props) {
  const { agencyId } = useAuth();
  const def = KIND_BY_KEY[kind];
  const { data: articles = [], isLoading } = useKnowledgeArticles(agencyId ?? undefined);
  const ws = useKnowledgeWorkspaceState();
  const setStatus = useSetArticleStatus();
  const assistant = useKnowledgeAssistant();

  const [q, setQ] = useState("");
  const [status, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const rows = useMemo(() => {
    let list = filterArticles(articles, { kind, q, status });
    if (onlyIds) list = list.filter((a) => onlyIds.includes(a.id));
    if (statuses) list = list.filter((a) => statuses.includes(a.status));
    return list;
  }, [articles, kind, q, status, onlyIds, statuses]);

  const selected: KnowledgeArticle | null = rows.find((r) => r.id === selectedId) ?? null;
  const versions = useArticleVersions(selected?.id);

  const select = (a: KnowledgeArticle) => {
    setSelectedId(a.id);
    ws.trackView(a.id);
    assistant.reset();
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{title ?? def.plural}</h2>
          <p className="text-sm text-muted-foreground">{description ?? def.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter knowledge…"
            className="w-56"
          />
          <Select value={status} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {KNOWLEDGE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <ResizablePanelGroup direction="horizontal" className="min-h-[560px] rounded-xl border bg-card/40 backdrop-blur">
        <ResizablePanel defaultSize={38} minSize={24}>
          <ScrollArea className="h-[560px]">
            <div className="divide-y">
              {isLoading && <p className="p-4 text-sm text-muted-foreground">Loading knowledge…</p>}
              {!isLoading && rows.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">No knowledge matches this view.</p>
              )}
              {rows.map((a) => (
                <button
                  key={a.id}
                  onClick={() => select(a)}
                  className={cn(
                    "block w-full px-4 py-3 text-left transition-colors hover:bg-muted/50",
                    selectedId === a.id && "bg-muted",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="line-clamp-1 text-sm font-medium">{a.title}</span>
                    <Badge variant={STATUS_TONE[a.status] ?? "outline"} className="shrink-0 text-[10px]">
                      {a.status}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.body?.slice(0, 160) || "No summary yet."}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                    <span>v{a.version}</span>
                    <span>·</span>
                    <span>{fmtDate(a.updated_at)}</span>
                    {(a.tags ?? []).slice(0, 3).map((t) => (
                      <Badge key={t} variant="outline" className="text-[9px]">{t}</Badge>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={62} minSize={35}>
          {!selected ? (
            <div className="flex h-[560px] items-center justify-center p-6 text-sm text-muted-foreground">
              Select knowledge to open the viewer.
            </div>
          ) : (
            <ScrollArea className="h-[560px]">
              <div className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{selected.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      v{selected.version} · {selected.kind} · updated {fmtDate(selected.updated_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => ws.toggleBookmark(selected.id)}
                      aria-label="Bookmark article"
                    >
                      {ws.bookmarks.includes(selected.id)
                        ? <BookmarkCheck className="h-4 w-4" />
                        : <Bookmark className="h-4 w-4" />}
                    </Button>
                    <Select
                      value={selected.status}
                      onValueChange={(v) => setStatus.mutate({ id: selected.id, status: v })}
                    >
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KNOWLEDGE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Tabs defaultValue="content">
                  <TabsList>
                    <TabsTrigger value="content">Content</TabsTrigger>
                    <TabsTrigger value="related">Related</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                    <TabsTrigger value="notes">Annotations</TabsTrigger>
                    <TabsTrigger value="ai">AI Assistant</TabsTrigger>
                  </TabsList>

                  <TabsContent value="content" className="pt-3">
                    <article className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                      {selected.body?.trim() || "This knowledge record has no body content yet."}
                    </article>
                  </TabsContent>

                  <TabsContent value="related" className="space-y-2 pt-3">
                    {articles
                      .filter((a) =>
                        a.id !== selected.id &&
                        (a.tags ?? []).some((t) => (selected.tags ?? []).includes(t)))
                      .slice(0, 8)
                      .map((a) => (
                        <button
                          key={a.id}
                          onClick={() => select(a)}
                          className="block w-full rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted/50"
                        >
                          <span className="font-medium">{a.title}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{a.kind} · v{a.version}</span>
                        </button>
                      ))}
                    <p className="text-xs text-muted-foreground">
                      Related policies, workflows, decisions, timeline events and automation are linked through the
                      shared Workforce Graph relations for this article.
                    </p>
                  </TabsContent>

                  <TabsContent value="history" className="space-y-2 pt-3">
                    {versions.isLoading && <p className="text-sm text-muted-foreground">Loading versions…</p>}
                    {(versions.data ?? []).map((v) => (
                      <div key={v.id} className="rounded-lg border px-3 py-2 text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">v{v.version} — {v.title}</span>
                          <span className="text-xs text-muted-foreground">{fmtDate(v.edited_at)}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{v.body?.slice(0, 200)}</p>
                      </div>
                    ))}
                    {!versions.isLoading && (versions.data ?? []).length === 0 && (
                      <p className="text-sm text-muted-foreground">No prior versions recorded.</p>
                    )}
                  </TabsContent>

                  <TabsContent value="notes" className="space-y-3 pt-3">
                    <div className="flex gap-2">
                      <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add an annotation…" />
                      <Button
                        size="sm"
                        disabled={!note.trim()}
                        onClick={() => { ws.addAnnotation(selected.id, note.trim()); setNote(""); }}
                      >
                        Add
                      </Button>
                    </div>
                    {(ws.annotations[selected.id] ?? []).map((a) => (
                      <div key={a.id} className="rounded-lg border px-3 py-2 text-sm">
                        {a.text}
                        <p className="mt-1 text-[10px] text-muted-foreground">{fmtDate(a.at)}</p>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="ai" className="space-y-3 pt-3">
                    <div className="flex flex-wrap gap-1.5">
                      {ASSISTANT_TASKS.map((t) => (
                        <Button
                          key={t.key}
                          size="sm"
                          variant="outline"
                          disabled={!agencyId || assistant.isPending}
                          onClick={() =>
                            assistant.mutate({ agency_id: agencyId!, task: t.key, article: selected })
                          }
                        >
                          <Sparkles className="mr-1 h-3 w-3" />{t.label}
                        </Button>
                      ))}
                    </div>
                    <Separator />
                    {assistant.isPending && (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> WOIC is thinking…
                      </p>
                    )}
                    {assistant.error && (
                      <p className="text-sm text-destructive">{(assistant.error as Error).message}</p>
                    )}
                    {assistant.data && (
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          {assistant.data.task}
                        </p>
                        <p className="whitespace-pre-wrap text-sm">{assistant.data.text}</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
