import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUp, ChevronDown, ChevronRight, Pause, Play, RefreshCw, Save, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { EventRow } from "@/components/activity/EventRow";
import { EventInspector } from "@/components/activity/EventInspector";
import { refreshPinned, useEventCounts, useLiveEvents, usePersistedState } from "@/hooks/activity/use-event-fabric";
import { CATEGORY_LABEL, categoryOf, type EventCategory, type FabricEvent } from "@/lib/activity/events";

const CATEGORIES = Object.keys(CATEGORY_LABEL) as EventCategory[];

interface Preset {
  name: string;
  q: string;
  categories: EventCategory[];
}

export default function LiveEvents() {
  const { events, pending, connected, paused, setPaused, held, setHold, release, refresh } = useLiveEvents(200);
  const [q, setQ] = useState("");
  const [cats, setCats] = useState<EventCategory[]>([]);
  const [pinnedEvents, setPinnedEvents] = usePersistedState<FabricEvent[]>("pinned-events", []);
  const pinned = useMemo(() => pinnedEvents.map((e) => e.id), [pinnedEvents]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [presets, setPresets] = usePersistedState<Preset[]>("presets", []);
  const [selected, setSelected] = useState<FabricEvent | null>(null);
  const [autoScroll, setAutoScroll] = usePersistedState<boolean>("autoscroll", true);

  const filtered = useMemo(
    () =>
      events.filter((e) => {
        const hay = `${e.name} ${e.module} ${e.entity_type ?? ""} ${e.status}`.toLowerCase();
        if (q && !hay.includes(q.trim().toLowerCase())) return false;
        if (cats.length && !cats.includes(categoryOf(e))) return false;
        return true;
      }),
    [events, q, cats],
  );

  const counts = useEventCounts(events);

  // Keep pinned copies current while they're still in the stream; they survive scrolling out.
  useEffect(() => {
    setPinnedEvents((prev) => refreshPinned(prev, events));
  }, [events, setPinnedEvents]);

  // Auto-scroll: newest is at the top. While on, stay pinned to the top; if the user scrolls
  // down to read, hold new events instead of shifting the list under them.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onScroll = () => setHold(autoScroll ? vp.scrollTop > 48 : false);
    vp.addEventListener("scroll", onScroll, { passive: true });
    return () => vp.removeEventListener("scroll", onScroll);
  }, [autoScroll, setHold]);

  useEffect(() => {
    if (autoScroll && !held && viewportRef.current) viewportRef.current.scrollTo({ top: 0, behavior: "smooth" });
  }, [events, autoScroll, held]);

  useEffect(() => { if (!autoScroll) setHold(false); }, [autoScroll, setHold]);

  const showNew = () => {
    viewportRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    setHold(false);
    if (paused) setPaused(false);
    release();
  };
  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const toggleCat = (c: EventCategory) => setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  const togglePin = (id: string) =>
    setPinnedEvents((prev) => {
      if (prev.some((e) => e.id === id)) return prev.filter((e) => e.id !== id);
      const e = events.find((x) => x.id === id);
      return e ? [e, ...prev].slice(0, 50) : prev;
    });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-b bg-card/60 backdrop-blur">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Live event stream</CardTitle>
            <Badge variant={connected ? "default" : "outline"} className="text-[10px]">
              {paused ? "paused" : connected ? "live" : "polling"}
            </Badge>
            <span className="text-xs text-muted-foreground">{filtered.length} shown</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Quick search…"
              className="h-8 w-48"
              aria-label="Quick search events"
            />
            <Button variant={paused ? "default" : "outline"} size="sm" onClick={() => setPaused(!paused)} aria-pressed={paused}>
              {paused ? <Play className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />}
              {paused ? `Resume${pending ? ` (${pending})` : ""}` : "Pause"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAutoScroll(!autoScroll)} aria-pressed={autoScroll}>
              {autoScroll ? "Auto-scroll on" : "Auto-scroll off"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => void refresh()} aria-label="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleCat(c)}
                aria-pressed={cats.includes(c)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                  cats.includes(c) ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent/40",
                )}
              >
                {CATEGORY_LABEL[c]}
              </button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => {
                const name = q || cats.join("+") || "Preset";
                setPresets([...presets, { name, q, categories: cats }]);
              }}
            >
              <Save className="mr-1 h-3.5 w-3.5" /> Save filter
            </Button>
          </div>

          {presets.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p, i) => (
                <span key={`${p.name}-${i}`} className="flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setQ(p.q);
                      setCats(p.categories);
                    }}
                  >
                    {p.name}
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete preset ${p.name}`}
                    onClick={() => setPresets(presets.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="relative">
          {pending > 0 && (
            <Button size="sm" className="absolute left-1/2 top-2 z-10 -translate-x-1/2 shadow-md" onClick={showNew}>
              <ArrowUp className="mr-1 h-3.5 w-3.5" /> {pending} new event{pending === 1 ? "" : "s"}
            </Button>
          )}
          <ScrollArea className="h-[62vh] rounded-lg border" viewportRef={viewportRef}>
            <div className="space-y-1 p-2">
              {filtered.map((e) => (
                <div key={e.id}>
                  <div className="flex items-start gap-1">
                    <button
                      type="button"
                      className="mt-2.5 rounded p-0.5 text-muted-foreground hover:text-foreground"
                      aria-label={expanded.has(e.id) ? "Collapse details" : "Expand details"}
                      aria-expanded={expanded.has(e.id)}
                      onClick={() => toggleExpand(e.id)}
                    >
                      {expanded.has(e.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <EventRow
                        event={e}
                        onSelect={setSelected}
                        pinned={pinned.includes(e.id)}
                        onTogglePin={togglePin}
                        selected={selected?.id === e.id}
                      />
                    </div>
                  </div>
                  {expanded.has(e.id) && <EventDetails event={e} onOpen={() => setSelected(e)} />}
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  No events match the current filters. Events stream in as modules emit them.
                </p>
              )}
            </div>
          </ScrollArea>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pinned ({pinnedEvents.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {pinnedEvents.map((e) => (
              <EventRow key={e.id} event={e} dense onSelect={setSelected} pinned onTogglePin={togglePin} />
            ))}
            {pinnedEvents.length === 0 && <p className="text-xs text-muted-foreground">Pin events to keep them in view.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Module volume</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {counts.map(([module, count]) => (
              <div key={module} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono">{module}</span>
                  <span className="text-muted-foreground">{count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full bg-primary"
                    style={{ width: `${Math.round((count / (counts[0]?.[1] || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {counts.length === 0 && <p className="text-xs text-muted-foreground">No traffic yet.</p>}
          </CardContent>
        </Card>
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

function EventDetails({ event, onOpen }: { event: FabricEvent; onOpen: () => void }) {
  const rows: Array<[string, string | null | undefined]> = [
    ["Event ID", event.id],
    ["Module", event.module],
    ["Status", event.status],
    ["Entity", event.entity_type ? `${event.entity_type} ${event.entity_id ?? ""}` : null],
    ["Correlation ID", event.correlation_id],
    ["Actor", event.actor_id],
    ["Created", format(new Date(event.created_at), "PPpp")],
    ["Processed", event.processed_at ? format(new Date(event.processed_at), "PPpp") : null],
  ];
  return (
    <div className="ml-6 mt-1 space-y-2 rounded-lg border bg-muted/40 p-3 text-xs">
      <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1">
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="break-all font-mono">{v}</dd>
          </div>
        ))}
      </dl>
      {event.metadata && Object.keys(event.metadata as object).length > 0 && (
        <pre className="max-h-48 overflow-auto rounded bg-background p-2 font-mono text-[11px]">{JSON.stringify(event.metadata, null, 2)}</pre>
      )}
      {Array.isArray(event.related_objects) && event.related_objects.length > 0 && (
        <pre className="max-h-32 overflow-auto rounded bg-background p-2 font-mono text-[11px]">{JSON.stringify(event.related_objects, null, 2)}</pre>
      )}
      <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={onOpen}>Open full inspector</Button>
    </div>
  );
}
