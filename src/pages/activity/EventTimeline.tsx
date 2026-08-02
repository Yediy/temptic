import { useMemo, useState } from "react";
import { format, startOfHour, startOfDay, startOfMonth, subDays, subHours, subMonths, subYears } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { EventInspector } from "@/components/activity/EventInspector";
import { EventRow } from "@/components/activity/EventRow";
import { useEventSearch } from "@/hooks/activity/use-event-fabric";
import { CATEGORY_CLASS, CATEGORY_LABEL, categoryOf, type EventCategory, type FabricEvent } from "@/lib/activity/events";

type Zoom = "hour" | "day" | "week" | "month" | "year";

const ZOOMS: Array<{ key: Zoom; label: string; from: () => Date; bucket: (d: Date) => Date; fmt: string }> = [
  { key: "hour", label: "Hour", from: () => subHours(new Date(), 1), bucket: (d) => new Date(Math.floor(d.getTime() / 300000) * 300000), fmt: "HH:mm" },
  { key: "day", label: "Day", from: () => subDays(new Date(), 1), bucket: startOfHour, fmt: "HH:mm" },
  { key: "week", label: "Week", from: () => subDays(new Date(), 7), bucket: startOfDay, fmt: "MMM d" },
  { key: "month", label: "Month", from: () => subMonths(new Date(), 1), bucket: startOfDay, fmt: "MMM d" },
  { key: "year", label: "Year", from: () => subYears(new Date(), 1), bucket: startOfMonth, fmt: "MMM yyyy" },
];

export default function EventTimeline() {
  const [zoom, setZoom] = useState<Zoom>("day");
  const [cats, setCats] = useState<EventCategory[]>([]);
  const [selected, setSelected] = useState<FabricEvent | null>(null);
  const [activeBucket, setActiveBucket] = useState<string | null>(null);

  const cfg = ZOOMS.find((z) => z.key === zoom)!;
  const { data: events = [] } = useEventSearch({ from: cfg.from().toISOString(), sort: "newest", limit: 1000 });

  const visible = useMemo(
    () => events.filter((e) => (cats.length ? cats.includes(categoryOf(e)) : true)),
    [events, cats],
  );

  const buckets = useMemo(() => {
    const map = new Map<string, FabricEvent[]>();
    for (const e of visible) {
      const key = cfg.bucket(new Date(e.created_at)).toISOString();
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return Array.from(map.entries()).sort((a, b) => +new Date(a[0]) - +new Date(b[0]));
  }, [visible, cfg]);

  const max = Math.max(1, ...buckets.map(([, v]) => v.length));
  const bucketEvents = activeBucket ? (buckets.find(([k]) => k === activeBucket)?.[1] ?? []) : visible.slice(0, 100);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">Interactive timeline</CardTitle>
          <div className="flex flex-wrap items-center gap-1">
            {ZOOMS.map((z) => (
              <Button
                key={z.key}
                size="sm"
                variant={zoom === z.key ? "default" : "outline"}
                onClick={() => {
                  setZoom(z.key);
                  setActiveBucket(null);
                }}
              >
                {z.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(CATEGORY_LABEL) as EventCategory[]).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={cats.includes(c)}
                onClick={() => setCats((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]))}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px]",
                  cats.includes(c) ? CATEGORY_CLASS[c] : "text-muted-foreground hover:bg-accent/40",
                )}
              >
                {CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>

          <div className="flex h-48 items-end gap-1 overflow-x-auto rounded-lg border bg-card/50 p-3">
            {buckets.map(([key, items]) => {
              const critical = items.filter((i) => categoryOf(i) === "compliance").length;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveBucket(activeBucket === key ? null : key)}
                  title={`${format(new Date(key), "PPpp")} · ${items.length} events`}
                  className="group flex min-w-[14px] flex-1 flex-col items-center justify-end gap-1"
                >
                  <span className="text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100">{items.length}</span>
                  <span
                    className={cn(
                      "w-full rounded-t transition-colors",
                      activeBucket === key ? "bg-primary" : critical > 0 ? "bg-destructive/70" : "bg-primary/50 group-hover:bg-primary/80",
                    )}
                    style={{ height: `${Math.max(4, (items.length / max) * 130)}px` }}
                  />
                  <span className="w-full truncate text-center text-[8px] text-muted-foreground">
                    {format(new Date(key), cfg.fmt)}
                  </span>
                </button>
              );
            })}
            {buckets.length === 0 && (
              <p className="w-full text-center text-sm text-muted-foreground">No events in this window.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm">
            {activeBucket ? format(new Date(activeBucket), "PPpp") : "All events in window"}
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">{bucketEvents.length}</Badge>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[45vh] rounded-lg border">
            <div className="space-y-1 p-2">
              {bucketEvents.map((e) => (
                <EventRow key={e.id} event={e} onSelect={setSelected} selected={selected?.id === e.id} />
              ))}
              {bucketEvents.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Nothing here.</p>}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <EventInspector event={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} onSelectRelated={setSelected} />
    </div>
  );
}
