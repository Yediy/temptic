import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Crosshair, Layers, ZoomIn, ZoomOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { EventInspector } from "@/components/activity/EventInspector";
import { EventRow } from "@/components/activity/EventRow";
import { CATEGORY_LABEL, type EventCategory, type FabricEvent } from "@/lib/activity/events";
import { ZOOMS, ZOOM_ORDER, bucketIndexFor, buildBuckets, finerZoom, shiftAnchor, windowFor, type Zoom } from "@/lib/activity/timeline";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;
const COLS = "id,agency_id,module,name,actor_id,entity_type,entity_id,status,metadata,related_objects,correlation_id,processed_at,created_at";
const CATS = Object.keys(CATEGORY_LABEL) as EventCategory[];
const CAT_BG: Record<EventCategory, string> = {
  workforce: "bg-cat-workforce", operations: "bg-cat-operations", finance: "bg-cat-finance",
  compliance: "bg-cat-compliance", intelligence: "bg-cat-intelligence", system: "bg-cat-system",
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_EVENTS = 5000;

export default function EventTimeline() {
  const { agencyId } = useAuth();
  const [params, setParams] = useSearchParams();
  const [zoom, setZoom] = useState<Zoom>((params.get("zoom") as Zoom) && ZOOMS[params.get("zoom") as Zoom] ? (params.get("zoom") as Zoom) : "day");
  const [anchor, setAnchor] = useState<Date>(() => {
    const a = params.get("at");
    const d = a ? new Date(a) : new Date();
    return Number.isNaN(d.getTime()) ? new Date() : d;
  });
  const [hidden, setHidden] = useState<EventCategory[]>([]);
  const [stacked, setStacked] = useState(true);
  const [activeBucket, setActiveBucket] = useState<number | null>(null);
  const [selected, setSelected] = useState<FabricEvent | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [jumpText, setJumpText] = useState("");
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  const { start, end } = windowFor(zoom, anchor);
  const { data: events = [], isFetching } = useQuery({
    queryKey: ["fabric", "timeline", agencyId, zoom, start.toISOString()],
    enabled: !!agencyId,
    queryFn: async (): Promise<FabricEvent[]> => {
      const { data, error } = await sb.from("ttos_events").select(COLS).eq("agency_id", agencyId)
        .gte("created_at", start.toISOString()).lt("created_at", end.toISOString())
        .order("created_at", { ascending: false }).limit(MAX_EVENTS);
      if (error) throw error;
      return (data ?? []) as FabricEvent[];
    },
  });

  const shown = CATS.filter((c) => !hidden.includes(c));
  const buckets = useMemo(() => buildBuckets(zoom, anchor, events, shown), [zoom, anchor, events, shown.join()]);  // eslint-disable-line react-hooks/exhaustive-deps
  const allCounts = useMemo(() => {
    const totals = Object.fromEntries(CATS.map((c) => [c, 0])) as Record<EventCategory, number>;
    for (const b of buildBuckets(zoom, anchor, events, null)) for (const c of CATS) totals[c] += b.byCategory[c];
    return totals;
  }, [zoom, anchor, events]);
  const max = Math.max(1, ...buckets.map((b) => (stacked ? b.total : Math.max(...shown.map((c) => b.byCategory[c]), 0))));
  const listEvents = activeBucket !== null ? (buckets[activeBucket]?.events ?? []) : buckets.flatMap((b) => b.events).reverse();

  // Keep zoom + position in the URL so a timeline view can be shared or bookmarked.
  useEffect(() => {
    const next = new URLSearchParams(params);
    next.set("zoom", zoom);
    next.set("at", start.toISOString());
    if (highlight) next.set("event", highlight); else next.delete("event");
    setParams(next, { replace: true });
  }, [zoom, start.getTime(), highlight]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeZoom = (z: Zoom, at?: Date) => {
    setZoom(z);
    if (at) setAnchor(at);
    setActiveBucket(null);
  };
  const pan = (n: number) => { setAnchor(shiftAnchor(zoom, anchor, n)); setActiveBucket(null); };
  const zoomStep = (dir: 1 | -1) => {
    const i = ZOOM_ORDER.indexOf(zoom) + dir;
    if (i >= 0 && i < ZOOM_ORDER.length) {
      const at = activeBucket !== null && dir === 1 ? buckets[activeBucket].start : anchor;
      changeZoom(ZOOM_ORDER[i], at);
    }
  };

  // ---- Jump to event ----
  const pendingJump = useRef<FabricEvent | null>(null);
  const jumpTo = (e: FabricEvent, z: Zoom = zoom) => {
    if (hidden.length) setHidden((h) => h.filter((c) => c !== (CATS.find((x) => x === (e as never)) ?? "")));
    pendingJump.current = e;
    setZoom(z);
    setAnchor(new Date(e.created_at));
    setHighlight(e.id);
  };
  useEffect(() => {
    const e = pendingJump.current;
    if (!e) return;
    const idx = bucketIndexFor(buckets, new Date(e.created_at));
    if (idx < 0 || !buckets[idx].events.some((x) => x.id === e.id)) return; // wait for data
    pendingJump.current = null;
    setActiveBucket(idx);
    setSelected(e);
    requestAnimationFrame(() => rowRefs.current.get(e.id)?.scrollIntoView({ block: "center", behavior: "smooth" }));
  }, [buckets]);

  const findAndJump = async (raw: string) => {
    const id = raw.trim();
    if (!UUID_RE.test(id) || !agencyId) {
      toast({ title: "Enter an event ID or correlation ID", variant: "destructive" });
      return;
    }
    const { data } = await sb.from("ttos_events").select(COLS).eq("agency_id", agencyId)
      .or(`id.eq.${id},correlation_id.eq.${id}`).order("created_at", { ascending: true }).limit(1);
    const e = (data ?? [])[0] as FabricEvent | undefined;
    if (!e) { toast({ title: "No event found with that ID", variant: "destructive" }); return; }
    setHidden([]);
    jumpTo(e, zoom === "year" || zoom === "month" ? "day" : zoom);
  };

  // Deep link: /activity/timeline?event=<id>
  const initialEvent = useRef(params.get("event"));
  useEffect(() => {
    if (initialEvent.current && agencyId) { void findAndJump(initialEvent.current); initialEvent.current = null; }
  }, [agencyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const neighbor = (dir: 1 | -1) => {
    const list = listEvents;
    const i = list.findIndex((e) => e.id === highlight);
    const next = list[i + dir] ?? (i < 0 ? list[0] : undefined);
    if (next) { setHighlight(next.id); setSelected(next); rowRefs.current.get(next.id)?.scrollIntoView({ block: "center", behavior: "smooth" }); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => pan(-1)} aria-label="Previous period"><ChevronLeft className="h-4 w-4" /></Button>
              <CardTitle className="min-w-[180px] text-center text-base">{format(start, ZOOMS[zoom].titleFmt)}</CardTitle>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => pan(1)} aria-label="Next period"><ChevronRight className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => changeZoom(zoom, new Date())}>Now</Button>
              {isFetching && <span className="text-xs text-muted-foreground">Loading…</span>}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => zoomStep(-1)} disabled={zoom === "year"} aria-label="Zoom out"><ZoomOut className="h-4 w-4" /></Button>
              {ZOOM_ORDER.map((z) => (
                <Button key={z} size="sm" variant={zoom === z ? "default" : "outline"} onClick={() => changeZoom(z)}>{ZOOMS[z].label}</Button>
              ))}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => zoomStep(1)} disabled={zoom === "hour"} aria-label="Zoom in"><ZoomIn className="h-4 w-4" /></Button>
            </div>
          </div>
          <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); void findAndJump(jumpText); }}>
            <Input value={jumpText} onChange={(e) => setJumpText(e.target.value)} placeholder="Jump to event ID or correlation ID…" className="h-8 max-w-sm font-mono text-xs" />
            <Button type="submit" size="sm" variant="outline"><Crosshair className="mr-1 h-3.5 w-3.5" /> Jump</Button>
          </form>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 flex items-center gap-1 text-xs text-muted-foreground"><Layers className="h-3.5 w-3.5" /> Overlays</span>
            {CATS.map((c) => {
              const on = !hidden.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setHidden((h) => (on ? [...h, c] : h.filter((x) => x !== c)))}
                  className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-opacity", !on && "opacity-40")}
                >
                  <span className={cn("h-2.5 w-2.5 rounded-sm", CAT_BG[c])} />
                  {CATEGORY_LABEL[c]}
                  <span className="text-muted-foreground">{allCounts[c]}</span>
                </button>
              );
            })}
            <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => setStacked(!stacked)}>
              {stacked ? "Stacked" : "Side by side"}
            </Button>
            {hidden.length > 0 && <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => setHidden([])}>Show all</Button>}
          </div>

          <div className="flex h-56 items-end gap-0.5 rounded-lg border bg-card/50 p-3">
            {buckets.map((b, i) => {
              const isActive = activeBucket === i;
              const hasHighlight = !!highlight && b.events.some((e) => e.id === highlight);
              return (
                <button
                  key={b.start.toISOString()}
                  type="button"
                  onClick={() => setActiveBucket(isActive ? null : i)}
                  onDoubleClick={() => { const f = finerZoom(zoom); if (f) changeZoom(f, b.start); }}
                  title={`${format(b.start, "PPpp")} · ${b.total} events${finerZoom(zoom) ? " · double-click to zoom in" : ""}`}
                  className={cn("group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1 rounded-sm", isActive && "bg-accent/50")}
                >
                  {hasHighlight && <Crosshair className="absolute top-0 h-3 w-3 text-primary" />}
                  <span className="text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100">{b.total || ""}</span>
                  <div className={cn("flex w-full items-end justify-center", stacked ? "flex-col-reverse" : "flex-row gap-px")} style={{ height: 150 }}>
                    {shown.map((c) => {
                      const n = b.byCategory[c];
                      if (!n) return null;
                      return (
                        <span
                          key={c}
                          className={cn(CAT_BG[c], stacked ? "w-full first:rounded-b-none last:rounded-t" : "flex-1 rounded-t", "opacity-80 group-hover:opacity-100")}
                          style={{ height: `${Math.max(2, (n / max) * 150)}px` }}
                        />
                      );
                    })}
                    {b.total === 0 && <span className="h-px w-full bg-border" />}
                  </div>
                  <span className="w-full truncate text-center text-[9px] text-muted-foreground">
                    {buckets.length > 31 && i % 2 ? "" : format(b.start, ZOOMS[zoom].bucketFmt)}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Click a bar to list its events · double-click to zoom in{events.length >= MAX_EVENTS ? ` · showing the latest ${MAX_EVENTS.toLocaleString()} events in this period` : ""}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm">
            {activeBucket !== null ? `${format(buckets[activeBucket].start, "PPpp")} – ${format(buckets[activeBucket].end, "p")}` : `All events · ${format(start, ZOOMS[zoom].titleFmt)}`}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-[10px]">{listEvents.length}</Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => neighbor(-1)} aria-label="Previous event"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => neighbor(1)} aria-label="Next event"><ChevronRight className="h-4 w-4" /></Button>
            {activeBucket !== null && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setActiveBucket(null)}>Clear</Button>}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[45vh] rounded-lg border">
            <div className="space-y-1 p-2">
              {listEvents.map((e) => (
                <div
                  key={e.id}
                  ref={(el) => { if (el) rowRefs.current.set(e.id, el); else rowRefs.current.delete(e.id); }}
                  className={cn("flex items-center gap-1 rounded-lg", highlight === e.id && "ring-2 ring-primary")}
                >
                  <div className="min-w-0 flex-1">
                    <EventRow event={e} onSelect={(x) => { setSelected(x); setHighlight(x.id); }} selected={selected?.id === e.id} />
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Jump to this moment at hour zoom" aria-label="Jump to event" onClick={() => jumpTo(e, "hour")}>
                    <Crosshair className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              {listEvents.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No events here.</p>}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <EventInspector
        event={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        onSelectRelated={(e) => jumpTo(e)}
      />
    </div>
  );
}
