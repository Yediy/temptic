import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pause, Play, RefreshCw, Save, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { EventRow } from "@/components/activity/EventRow";
import { EventInspector } from "@/components/activity/EventInspector";
import { useEventCounts, useLiveEvents, usePersistedState } from "@/hooks/activity/use-event-fabric";
import { CATEGORY_LABEL, categoryOf, type EventCategory, type FabricEvent } from "@/lib/activity/events";

const CATEGORIES = Object.keys(CATEGORY_LABEL) as EventCategory[];

interface Preset {
  name: string;
  q: string;
  categories: EventCategory[];
}

export default function LiveEvents() {
  const { events, connected, paused, setPaused, refresh } = useLiveEvents(200);
  const [q, setQ] = useState("");
  const [cats, setCats] = useState<EventCategory[]>([]);
  const [pinned, setPinned] = usePersistedState<string[]>("pinned", []);
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

  const pinnedEvents = events.filter((e) => pinned.includes(e.id));
  const counts = useEventCounts(events);

  const toggleCat = (c: EventCategory) => setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  const togglePin = (id: string) => setPinned((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-b bg-card/60 backdrop-blur">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Live event stream</CardTitle>
            <Badge variant={connected ? "default" : "outline"} className="text-[10px]">
              {connected ? "realtime" : "polling"}
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
            <Button variant="outline" size="sm" onClick={() => setPaused(!paused)}>
              {paused ? <Play className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />}
              {paused ? "Resume" : "Pause"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAutoScroll(!autoScroll)}>
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

          <ScrollArea className={cn("rounded-lg border", autoScroll ? "h-[62vh]" : "h-[62vh]")}>
            <div className="space-y-1 p-2">
              {filtered.map((e) => (
                <EventRow
                  key={e.id}
                  event={e}
                  onSelect={setSelected}
                  pinned={pinned.includes(e.id)}
                  onTogglePin={togglePin}
                  selected={selected?.id === e.id}
                />
              ))}
              {filtered.length === 0 && (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  No events match the current filters. Events stream in as modules emit them.
                </p>
              )}
            </div>
          </ScrollArea>
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
