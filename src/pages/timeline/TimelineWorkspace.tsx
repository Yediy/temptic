import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Bookmark,
  Download,
  Filter,
  Loader2,
  Pin,
  RefreshCw,
  Repeat,
  Search,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { EventRow } from "@/components/activity/EventRow";
import { EventInspector } from "@/components/activity/EventInspector";
import { useActivitySubjects, useEventReplay } from "@/hooks/activity/use-event-fabric";
import {
  EMPTY_FILTERS,
  exportTimelineCsv,
  usePinnedEvents,
  useRecentSearches,
  useSavedTimelineViews,
  useTimeline,
  useTimelineAi,
  useTimelineAnalytics,
  useTimelineGroups,
  useTimelineSettings,
  type TimelineAiTask,
  type TimelineFilters,
} from "@/hooks/timeline/use-timeline";
import { CATEGORY_LABEL, type FabricEvent } from "@/lib/activity/events";
import { scopeByKey, type TimelineScopeKey } from "@/lib/timeline/scopes";

const AI_TASKS: Array<{ key: TimelineAiTask; label: string }> = [
  { key: "summarize", label: "Summarize" },
  { key: "explain", label: "Explain" },
  { key: "anomalies", label: "Anomalies" },
  { key: "bottlenecks", label: "Bottlenecks" },
  { key: "predict", label: "Predict next" },
  { key: "improvements", label: "Improvements" },
  { key: "incident_report", label: "Incident report" },
  { key: "executive_summary", label: "Executive summary" },
  { key: "similar_cases", label: "Similar cases" },
];

const SEVERITIES = ["critical", "warning", "info", "success"] as const;

export default function TimelineWorkspace({ scopeKey }: { scopeKey: TimelineScopeKey }) {
  const scope = scopeByKey(scopeKey);
  const { settings } = useTimelineSettings();
  const [filters, setFilters] = useState<TimelineFilters>({ ...EMPTY_FILTERS, limit: settings.defaultLimit });
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<FabricEvent | null>(null);
  const [aiOutput, setAiOutput] = useState<string>("");
  const [visible, setVisible] = useState(60);

  const { events, isLoading, refetch, isFetching } = useTimeline(scope, filters);
  const analytics = useTimelineAnalytics(events);
  const groups = useTimelineGroups(events.slice(0, visible));
  const { pinned, toggle } = usePinnedEvents();
  const { views, setViews } = useSavedTimelineViews();
  const { recent, push } = useRecentSearches();
  const { data: subjects } = useActivitySubjects();
  const ai = useTimelineAi();
  const { replay, running } = useEventReplay();

  const pinnedEvents = useMemo(() => events.filter((e) => pinned.includes(e.id)), [events, pinned]);

  const patch = (p: Partial<TimelineFilters>) => {
    setVisible(60);
    setFilters((f) => ({ ...f, ...p }));
  };

  const runAi = async (task: TimelineAiTask) => {
    setAiOutput("");
    try {
      const text = await ai.mutateAsync({ task, scope: scope.key, events });
      setAiOutput(text);
    } catch (e) {
      toast({
        title: "WOIC unavailable",
        description: e instanceof Error ? e.message : "Could not reach the cognitive core.",
        variant: "destructive",
      });
    }
  };

  const saveView = () => {
    const name = window.prompt("Name this view");
    if (!name) return;
    setViews((v) => [
      { id: crypto.randomUUID(), name, scope: scope.key, filters, created_at: new Date().toISOString() },
      ...v,
    ]);
    toast({ title: "View saved", description: name });
  };

  const replaySequence = async () => {
    const ids = (pinnedEvents.length ? pinnedEvents : events.slice(0, 25)).map((e) => e.id);
    const res = await replay(ids, { dryRun: true });
    toast({ title: "Replay simulated", description: `${res.length} events walked through the engine (dry run).` });
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        <Card>
          <CardHeader className="space-y-3 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">{scope.label}</CardTitle>
                <p className="text-xs text-muted-foreground">{scope.description}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button size="sm" variant="outline" onClick={() => setShowFilters((s) => !s)}>
                  <Filter className="mr-1.5 h-3.5 w-3.5" /> Filters
                </Button>
                <Button size="sm" variant="outline" onClick={saveView}>
                  <Bookmark className="mr-1.5 h-3.5 w-3.5" /> Save view
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportTimelineCsv(events, `timeline-${scope.key}.csv`)}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Export
                </Button>
                <Button size="sm" variant="outline" disabled={running} onClick={replaySequence}>
                  <Repeat className="mr-1.5 h-3.5 w-3.5" /> Replay
                </Button>
                <Button size="sm" variant="outline" disabled={isFetching} onClick={() => refetch()}>
                  <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
                </Button>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search events — natural language or event name…"
                value={filters.search}
                onChange={(e) => patch({ search: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && push(filters.search)}
              />
            </div>

            {recent.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {recent.slice(0, 8).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => patch({ search: r })}
                    className="rounded-full border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent/40"
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}

            {showFilters && (
              <div className="grid gap-3 rounded-lg border bg-card/50 p-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs">Entity type</Label>
                  <Input
                    value={filters.entityType}
                    placeholder={scope.entityType ?? "any"}
                    onChange={(e) => patch({ entityType: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Entity / subject</Label>
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={filters.entityId}
                    onChange={(e) => patch({ entityId: e.target.value })}
                  >
                    <option value="">All subjects</option>
                    <optgroup label="Workers">
                      {(subjects?.workers ?? []).map((w) => (
                        <option key={w.id} value={w.id}>{w.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Organizations">
                      {(subjects?.clients ?? []).map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Correlation ID</Label>
                  <Input value={filters.correlationId} onChange={(e) => patch({ correlationId: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">From</Label>
                  <Input type="date" value={filters.from} onChange={(e) => patch({ from: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">To</Label>
                  <Input type="date" value={filters.to} onChange={(e) => patch({ to: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tag / custom attribute</Label>
                  <Input
                    value={filters.tags}
                    placeholder="matches metadata"
                    onChange={(e) => patch({ tags: e.target.value })}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                  <Label className="text-xs">Severity / risk</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {SEVERITIES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={filters.severities.includes(s)}
                        onClick={() =>
                          patch({
                            severities: filters.severities.includes(s)
                              ? filters.severities.filter((x) => x !== s)
                              : [...filters.severities, s],
                          })
                        }
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px] capitalize",
                          filters.severities.includes(s)
                            ? "border-primary bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-accent/40",
                        )}
                      >
                        {s}
                      </button>
                    ))}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setFilters({ ...EMPTY_FILTERS, limit: settings.defaultLimit })}
                    >
                      Reset
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => patch({ sort: filters.sort === "newest" ? "oldest" : "newest" })}
                    >
                      Sort: {filters.sort}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-3">
            {pinnedEvents.length > 0 && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-2">
                <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-primary">
                  <Pin className="h-3 w-3" /> Pinned ({pinnedEvents.length})
                </p>
                <div className="space-y-1">
                  {pinnedEvents.map((e) => (
                    <EventRow key={e.id} event={e} pinned onTogglePin={toggle} onSelect={setSelected} dense />
                  ))}
                </div>
              </div>
            )}

            <ScrollArea className="h-[60vh] rounded-lg border">
              <div className="space-y-3 p-2">
                {isLoading && (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" /> Loading timeline…
                  </p>
                )}
                {!isLoading && events.length === 0 && (
                  <p className="py-10 text-center text-sm text-muted-foreground">No history in this scope yet.</p>
                )}
                {settings.grouping === "day"
                  ? groups.map(([day, items]) => (
                      <section key={day} className="space-y-1">
                        <div className="sticky top-0 z-10 flex items-center gap-2 bg-background/95 py-1 backdrop-blur">
                          <span className="text-xs font-semibold">{format(new Date(day), "EEEE, MMM d yyyy")}</span>
                          <Separator className="flex-1" />
                          <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
                        </div>
                        {items.map((e) => (
                          <EventRow
                            key={e.id}
                            event={e}
                            onSelect={setSelected}
                            pinned={pinned.includes(e.id)}
                            onTogglePin={toggle}
                            selected={selected?.id === e.id}
                            dense={settings.density === "dense"}
                          />
                        ))}
                      </section>
                    ))
                  : events.slice(0, visible).map((e) => (
                      <EventRow
                        key={e.id}
                        event={e}
                        onSelect={setSelected}
                        pinned={pinned.includes(e.id)}
                        onTogglePin={toggle}
                        selected={selected?.id === e.id}
                        dense={settings.density === "dense"}
                      />
                    ))}

                {visible < events.length && (
                  <Button variant="outline" className="w-full" onClick={() => setVisible((v) => v + 60)}>
                    Load more ({events.length - visible} remaining)
                  </Button>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {settings.showAiPanel && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" /> WOIC timeline intelligence
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {AI_TASKS.map((t) => (
                  <Button
                    key={t.key}
                    size="sm"
                    variant="outline"
                    disabled={ai.isPending || events.length === 0}
                    onClick={() => runAi(t.key)}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
              {ai.isPending && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Reasoning over {Math.min(events.length, 120)} events…
                </p>
              )}
              {aiOutput && (
                <ScrollArea className="h-56 rounded-md border bg-muted/30 p-3">
                  <p className="whitespace-pre-wrap text-xs leading-relaxed">{aiOutput}</p>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}

        {settings.showAnalytics && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Timeline analytics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <Metric label="Events" value={analytics.total} />
                <Metric label="Per day" value={analytics.perDay} />
                <Metric label="Avg latency" value={`${analytics.avgLatencyMs} ms`} />
                <Metric label="Critical rate" value={`${analytics.criticalRate}%`} />
                <Metric label="Unprocessed" value={analytics.unprocessed} />
                <Metric label="Busiest hour" value={analytics.busiestHour} />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">By category</p>
                {analytics.byCategory.map((c) => (
                  <div key={c.key} className="flex items-center justify-between">
                    <span>{CATEGORY_LABEL[c.key as keyof typeof CATEGORY_LABEL] ?? c.key}</span>
                    <span className="text-muted-foreground">{c.count}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Slowest handlers</p>
                {analytics.slowest.length === 0 && <p className="text-muted-foreground">No processed events.</p>}
                {analytics.slowest.map((s, i) => (
                  <div key={`${s.name}-${i}`} className="flex items-center justify-between gap-2">
                    <span className="truncate">{s.name}</span>
                    <span className="text-muted-foreground">{s.ms} ms</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {views.filter((v) => v.scope === scope.key).length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Saved views</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {views
                .filter((v) => v.scope === scope.key)
                .map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setFilters(v.filters)}
                    className="w-full rounded-md border px-2.5 py-1.5 text-left text-xs hover:bg-accent/40"
                  >
                    {v.name}
                  </button>
                ))}
            </CardContent>
          </Card>
        )}
      </div>

      <EventInspector
        event={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        onSelectRelated={setSelected}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border bg-card/50 p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
