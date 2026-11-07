import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowDown, ArrowUp, Bookmark, BookmarkCheck, Copy, Download, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { EventRow } from "@/components/activity/EventRow";
import { EventInspector } from "@/components/activity/EventInspector";
import { fetchAllExplorerEvents, useExplorerQuery, usePersistedState } from "@/hooks/activity/use-event-fabric";
import type { FabricEvent } from "@/lib/activity/events";
import {
  FIELDS, NO_VALUE, OPERATORS_FOR, OPERATOR_LABEL, countActiveRules, emptyQuery, groupEvents, isComplete, newId,
  sortEvents, toCsv, type ExplorerQuery, type GroupBy, type Rule, type RuleGroup, type SortKey,
} from "@/lib/activity/explorer-query";

const SORT_FIELDS = ["created_at", "processed_at", "name", "module", "status", "entity_type", "correlation_id", "actor_id"];
const GROUPS: Record<GroupBy, string> = {
  none: "No grouping", module: "Module", status: "Status", entity_type: "Entity type", name: "Event name",
  day: "Day", hour: "Hour", correlation_id: "Correlation ID", actor_id: "Actor",
};
const LIMITS = [100, 300, 1000];

interface SavedView {
  id: string;
  name: string;
  query: ExplorerQuery;
  sort: SortKey[];
  groupBy: GroupBy;
  limit: number;
  savedAt: string;
}

function download(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function EventExplorer() {
  const { agencyId } = useAuth();
  const [query, setQuery] = useState<ExplorerQuery>(emptyQuery);
  const [sort, setSort] = useState<SortKey[]>([{ field: "created_at", dir: "desc" }]);
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [limit, setLimit] = useState(300);
  const [views, setViews] = usePersistedState<SavedView[]>("explorer-views", []);
  const [activeView, setActiveView] = useState<string | null>(null);
  const [viewName, setViewName] = useState("");
  const [bookmarks, setBookmarks] = usePersistedState<FabricEvent[]>("explorer-bookmarks", []);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [selected, setSelected] = useState<FabricEvent | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState<number | null>(null);

  const { data: raw = [], isLoading, error } = useExplorerQuery(query, sort, limit);
  const source = showBookmarks ? bookmarks : raw;
  const events = useMemo(() => sortEvents(source, sort), [source, sort]);
  const grouped = useMemo(() => groupEvents(events, groupBy), [events, groupBy]);
  const active = countActiveRules(query);
  const bookmarkIds = useMemo(() => new Set(bookmarks.map((b) => b.id)), [bookmarks]);

  // ---- rule editing ----
  const updateGroup = (gid: string, patch: (g: RuleGroup) => RuleGroup) =>
    setQuery((q) => ({ ...q, groups: q.groups.map((g) => (g.id === gid ? patch(g) : g)) }));
  const addRule = (gid: string) =>
    updateGroup(gid, (g) => ({ ...g, rules: [...g.rules, { id: newId(), field: "name", op: "contains", value: "" }] }));
  const setRule = (gid: string, rid: string, patch: Partial<Rule>) =>
    updateGroup(gid, (g) => ({
      ...g,
      rules: g.rules.map((r) => {
        if (r.id !== rid) return r;
        const next = { ...r, ...patch };
        const ops = OPERATORS_FOR[FIELDS[next.field].kind];
        if (!ops.includes(next.op)) next.op = ops[0];
        return next;
      }),
    }));
  const removeRule = (gid: string, rid: string) => updateGroup(gid, (g) => ({ ...g, rules: g.rules.filter((r) => r.id !== rid) }));
  const addGroup = () => setQuery((q) => ({ ...q, groups: [...q.groups, { id: newId(), match: "all", rules: [{ id: newId(), field: "name", op: "contains", value: "" }] }] }));
  const removeGroup = (gid: string) =>
    setQuery((q) => {
      const groups = q.groups.filter((g) => g.id !== gid);
      return { ...q, groups: groups.length ? groups : emptyQuery().groups };
    });

  // ---- views ----
  const saveView = (asNew: boolean) => {
    const name = viewName.trim() || `View ${views.length + 1}`;
    const view: SavedView = { id: asNew || !activeView ? newId() : activeView, name, query, sort, groupBy, limit, savedAt: new Date().toISOString() };
    setViews((vs) => (vs.some((v) => v.id === view.id) ? vs.map((v) => (v.id === view.id ? view : v)) : [...vs, view]));
    setActiveView(view.id);
    toast({ title: `Saved view "${name}"` });
  };
  const loadView = (v: SavedView) => {
    setQuery(v.query); setSort(v.sort); setGroupBy(v.groupBy); setLimit(v.limit);
    setActiveView(v.id); setViewName(v.name); setShowBookmarks(false);
  };
  const reset = () => {
    setQuery(emptyQuery()); setSort([{ field: "created_at", dir: "desc" }]); setGroupBy("none");
    setActiveView(null); setViewName("");
  };

  const toggleBookmark = (e: FabricEvent) =>
    setBookmarks((bs) => (bs.some((b) => b.id === e.id) ? bs.filter((b) => b.id !== e.id) : [e, ...bs].slice(0, 500)));

  // ---- export ----
  const doExport = async (format: "csv" | "json", scope: "shown" | "all") => {
    let rows = events;
    let truncated = false;
    if (scope === "all" && !showBookmarks) {
      if (!agencyId) return;
      try {
        setExporting(0);
        const res = await fetchAllExplorerEvents(agencyId, query, sort, 50_000, setExporting);
        rows = sortEvents(res.events, sort);
        truncated = res.truncated;
      } catch (e) {
        toast({ title: "Export failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
        return;
      } finally {
        setExporting(null);
      }
    }
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    if (format === "csv") download(`events-${stamp}.csv`, toCsv(rows), "text/csv");
    else download(`events-${stamp}.json`, JSON.stringify({ exported_at: new Date().toISOString(), query, sort, count: rows.length, events: rows }, null, 2), "application/json");
    toast({ title: `Exported ${rows.length.toLocaleString()} events`, description: truncated ? "Stopped at 50,000 — narrow the filters for the rest." : undefined });
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm">Filters {active > 0 && <Badge className="ml-1">{active}</Badge>}</CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={reset}>Reset</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {query.groups.length > 1 && (
              <div className="flex items-center gap-2 text-xs">
                Match
                <MatchToggle value={query.match} onChange={(m) => setQuery((q) => ({ ...q, match: m }))} />
                of the groups
              </div>
            )}
            {query.groups.map((g, gi) => (
              <div key={g.id} className="space-y-2 rounded-lg border p-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground">Group {gi + 1} · match</span>
                    <MatchToggle value={g.match} onChange={(m) => updateGroup(g.id, (x) => ({ ...x, match: m }))} />
                  </span>
                  {query.groups.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeGroup(g.id)} aria-label="Remove group">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                {g.rules.map((r) => (
                  <RuleEditor
                    key={r.id}
                    rule={r}
                    onChange={(p) => setRule(g.id, r.id, p)}
                    onRemove={() => removeRule(g.id, r.id)}
                  />
                ))}
                <Button variant="outline" size="sm" className="h-7 w-full text-xs" onClick={() => addRule(g.id)}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add condition
                </Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="h-7 w-full text-xs" onClick={addGroup}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add group
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Sort & group</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {sort.map((k, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-12 text-[11px] text-muted-foreground">{i === 0 ? "Sort by" : "then"}</span>
                <Select value={k.field} onValueChange={(v) => setSort((s) => s.map((x, j) => (j === i ? { ...x, field: v } : x)))}>
                  <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SORT_FIELDS.map((f) => <SelectItem key={f} value={f}>{FIELDS[f]?.label ?? f}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline" size="icon" className="h-8 w-8"
                  aria-label={k.dir === "asc" ? "Ascending" : "Descending"}
                  onClick={() => setSort((s) => s.map((x, j) => (j === i ? { ...x, dir: x.dir === "asc" ? "desc" : "asc" } : x)))}
                >
                  {k.dir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                </Button>
                {sort.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Remove sort" onClick={() => setSort((s) => s.filter((_, j) => j !== i))}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
            {sort.length < 4 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSort((s) => [...s, { field: "module", dir: "asc" }])}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add sort level
              </Button>
            )}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Select value={groupBy} onValueChange={(v) => { setGroupBy(v as GroupBy); setCollapsed(new Set()); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(GROUPS).map(([k, l]) => <SelectItem key={k} value={k}>{k === "none" ? l : `Group by ${l.toLowerCase()}`}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LIMITS.map((l) => <SelectItem key={l} value={String(l)}>Show {l.toLocaleString()}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Saved views</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-1.5">
              <Input value={viewName} onChange={(e) => setViewName(e.target.value)} placeholder="View name" className="h-8 text-xs" />
              <Button size="sm" className="h-8" onClick={() => saveView(false)}><Save className="mr-1 h-3.5 w-3.5" />{activeView ? "Update" : "Save"}</Button>
              {activeView && <Button size="sm" variant="outline" className="h-8" onClick={() => saveView(true)} aria-label="Save as new view"><Copy className="h-3.5 w-3.5" /></Button>}
            </div>
            {views.map((v) => (
              <div key={v.id} className={cn("flex items-center justify-between rounded border px-2 py-1 text-xs", activeView === v.id && "border-primary bg-primary/5")}>
                <button type="button" className="flex-1 text-left" onClick={() => loadView(v)}>
                  <span className="font-medium">{v.name}</span>
                  <span className="ml-1 text-muted-foreground">· {countActiveRules(v.query)} conditions</span>
                </button>
                <button type="button" aria-label={`Delete view ${v.name}`} onClick={() => { setViews(views.filter((x) => x.id !== v.id)); if (activeView === v.id) setActiveView(null); }}>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            ))}
            {views.length === 0 && <p className="text-xs text-muted-foreground">Save the current filters, sort and grouping to reuse them.</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 border-b">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{showBookmarks ? "Bookmarked events" : "Results"}</CardTitle>
            <span className="text-xs text-muted-foreground">
              {events.length.toLocaleString()}{!showBookmarks && raw.length >= limit ? "+ (showing first " + limit + ")" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={showBookmarks ? "default" : "outline"} size="sm" onClick={() => setShowBookmarks(!showBookmarks)}>
              <Bookmark className="mr-1 h-3.5 w-3.5" /> Bookmarks ({bookmarks.length})
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={exporting !== null}>
                  <Download className="mr-1 h-3.5 w-3.5" />
                  {exporting !== null ? `Exporting ${exporting.toLocaleString()}…` : "Export"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => void doExport("csv", "shown")}>CSV — shown results</DropdownMenuItem>
                <DropdownMenuItem onClick={() => void doExport("json", "shown")}>JSON — shown results</DropdownMenuItem>
                {!showBookmarks && <DropdownMenuItem onClick={() => void doExport("csv", "all")}>CSV — all matches (up to 50,000)</DropdownMenuItem>}
                {!showBookmarks && <DropdownMenuItem onClick={() => void doExport("json", "all")}>JSON — all matches (up to 50,000)</DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pt-3">
          {error && <p className="mb-2 text-sm text-destructive">Query failed: {(error as Error).message}</p>}
          <ScrollArea className="h-[72vh]">
            <div className="space-y-3 pr-3">
              {isLoading && !showBookmarks && <p className="py-10 text-center text-sm text-muted-foreground">Querying event fabric…</p>}
              {grouped.map((g) => (
                <div key={g.key} className="space-y-1">
                  {groupBy !== "none" && (
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded px-1 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground hover:bg-accent/40"
                      onClick={() => setCollapsed((c) => { const n = new Set(c); if (n.has(g.key)) n.delete(g.key); else n.add(g.key); return n; })}
                      aria-expanded={!collapsed.has(g.key)}
                    >
                      <span className="truncate font-mono normal-case tracking-normal">{g.key}</span>
                      <span>{g.items.length}</span>
                    </button>
                  )}
                  {!collapsed.has(g.key) && g.items.map((e) => (
                    <div key={e.id} className="flex items-center gap-1">
                      <div className="min-w-0 flex-1">
                        <EventRow event={e} onSelect={setSelected} selected={selected?.id === e.id} />
                      </div>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        aria-label={bookmarkIds.has(e.id) ? "Remove bookmark" : "Bookmark event"}
                        onClick={() => toggleBookmark(e)}
                      >
                        {bookmarkIds.has(e.id) ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    </div>
                  ))}
                </div>
              ))}
              {!isLoading && events.length === 0 && (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  {showBookmarks ? "No bookmarks yet. Use the bookmark icon on any event." : "No events match these conditions."}
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <EventInspector event={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} onSelectRelated={setSelected} />
    </div>
  );
}

function MatchToggle({ value, onChange }: { value: "all" | "any"; onChange: (v: "all" | "any") => void }) {
  return (
    <span className="inline-flex overflow-hidden rounded-md border">
      {(["all", "any"] as const).map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={value === m}
          onClick={() => onChange(m)}
          className={cn("px-2 py-0.5 text-[11px]", value === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent/40")}
        >
          {m === "all" ? "ALL" : "ANY"}
        </button>
      ))}
    </span>
  );
}

function RuleEditor({ rule, onChange, onRemove }: { rule: Rule; onChange: (p: Partial<Rule>) => void; onRemove: () => void }) {
  const kind = FIELDS[rule.field].kind;
  const incomplete = !isComplete(rule) && (rule.value || NO_VALUE.includes(rule.op));
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Select value={rule.field} onValueChange={(v) => onChange({ field: v })}>
          <SelectTrigger className="h-8 w-[118px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(FIELDS).map(([k, f]) => <SelectItem key={k} value={k}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={rule.op} onValueChange={(v) => onChange({ op: v as Rule["op"] })}>
          <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {OPERATORS_FOR[kind].map((o) => <SelectItem key={o} value={o}>{OPERATOR_LABEL[o]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className="ml-auto h-7 w-7" onClick={onRemove} aria-label="Remove condition">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex gap-1">
        {kind === "json" && (
          <Input className="h-8 w-[118px] font-mono text-xs" placeholder="key.path" value={rule.key ?? ""} onChange={(e) => onChange({ key: e.target.value })} />
        )}
        {!NO_VALUE.includes(rule.op) && (
          <Input
            className={cn("h-8 flex-1 text-xs", incomplete && "border-destructive")}
            type={kind === "date" ? "datetime-local" : "text"}
            placeholder={rule.op === "in" || rule.op === "not_in" ? "value1, value2, …" : kind === "uuid" ? "UUID" : "value"}
            value={rule.value}
            onChange={(e) => onChange({ value: e.target.value })}
          />
        )}
      </div>
    </div>
  );
}
