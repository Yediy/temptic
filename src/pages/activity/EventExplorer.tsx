import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Save, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { EventRow } from "@/components/activity/EventRow";
import { EventInspector } from "@/components/activity/EventInspector";
import { useEventModules, useEventSearch, usePersistedState, type EventFilters } from "@/hooks/activity/use-event-fabric";
import { humanizeName, type FabricEvent } from "@/lib/activity/events";

const STATUSES = ["pending", "processing", "processed", "failed"];

interface SavedView extends EventFilters {
  name: string;
  groupBy: string;
}

export default function EventExplorer() {
  const [filters, setFilters] = useState<EventFilters>({ sort: "newest", limit: 300 });
  const [groupBy, setGroupBy] = useState<"none" | "module" | "day" | "status">("none");
  const [views, setViews] = usePersistedState<SavedView[]>("views", []);
  const [bookmarks, setBookmarks] = usePersistedState<string[]>("bookmarks", []);
  const [selected, setSelected] = useState<FabricEvent | null>(null);

  const { data: modules = [] } = useEventModules();
  const { data: events = [], isLoading } = useEventSearch(filters);

  const grouped = useMemo(() => {
    if (groupBy === "none") return [{ key: "All results", items: events }];
    const map = new Map<string, FabricEvent[]>();
    for (const e of events) {
      const key =
        groupBy === "module" ? e.module : groupBy === "status" ? e.status : format(new Date(e.created_at), "PPP");
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return Array.from(map.entries()).map(([key, items]) => ({ key, items }));
  }, [events, groupBy]);

  const set = (patch: Partial<EventFilters>) => setFilters((f) => ({ ...f, ...patch }));

  const exportCsv = () => {
    const header = "created_at,name,module,status,entity_type,entity_id,correlation_id,actor_id\n";
    const body = events
      .map((e) =>
        [e.created_at, e.name, e.module, e.status, e.entity_type ?? "", e.entity_id ?? "", e.correlation_id ?? "", e.actor_id ?? ""]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([header + body], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `iwos-events-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <Card className="h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Keyword</Label>
            <Input
              value={filters.search ?? ""}
              onChange={(e) => set({ search: e.target.value })}
              placeholder="event.name contains…"
              className="h-8"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                className="h-8"
                onChange={(e) => set({ from: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                className="h-8"
                onChange={(e) => set({ to: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Modules</Label>
            <div className="flex flex-wrap gap-1">
              {modules.map((m) => {
                const active = filters.modules?.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      set({
                        modules: active ? filters.modules?.filter((x) => x !== m) : [...(filters.modules ?? []), m],
                      })
                    }
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[11px]",
                      active ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent/40",
                    )}
                  >
                    {m}
                  </button>
                );
              })}
              {modules.length === 0 && <span className="text-xs text-muted-foreground">No modules yet</span>}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <div className="flex flex-wrap gap-1">
              {STATUSES.map((s) => {
                const active = filters.statuses?.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      set({ statuses: active ? filters.statuses?.filter((x) => x !== s) : [...(filters.statuses ?? []), s] })
                    }
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[11px]",
                      active ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent/40",
                    )}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Entity type</Label>
            <Input className="h-8" value={filters.entityType ?? ""} onChange={(e) => set({ entityType: e.target.value || undefined })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Entity ID</Label>
            <Input className="h-8" value={filters.entityId ?? ""} onChange={(e) => set({ entityId: e.target.value || undefined })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Correlation / trace ID</Label>
            <Input
              className="h-8"
              value={filters.correlationId ?? ""}
              onChange={(e) => set({ correlationId: e.target.value || undefined })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Actor ID</Label>
            <Input className="h-8" value={filters.actorId ?? ""} onChange={(e) => set({ actorId: e.target.value || undefined })} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Sort</Label>
              <Select value={filters.sort ?? "newest"} onValueChange={(v) => set({ sort: v as "newest" | "oldest" })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Group by</Label>
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as typeof groupBy)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="module">Module</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="day">Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => setViews([...views, { ...filters, groupBy, name: filters.search || `View ${views.length + 1}` }])}
            >
              <Save className="mr-1 h-3.5 w-3.5" /> Save view
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={() => setFilters({ sort: "newest", limit: 300 })}>
              Reset
            </Button>
          </div>

          {views.length > 0 && (
            <div className="space-y-1 border-t pt-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Saved views</p>
              {views.map((v, i) => (
                <div key={`${v.name}-${i}`} className="flex items-center justify-between rounded border px-2 py-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      const { name: _n, groupBy: g, ...rest } = v;
                      setFilters(rest);
                      setGroupBy(g as typeof groupBy);
                    }}
                  >
                    {v.name}
                  </button>
                  <button type="button" aria-label={`Delete view ${v.name}`} onClick={() => setViews(views.filter((_, j) => j !== i))}>
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4" /> Results
            <Badge variant="outline" className="text-[10px]">{events.length}</Badge>
          </CardTitle>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={events.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[70vh] rounded-lg border">
            <div className="space-y-3 p-2">
              {isLoading && <p className="py-10 text-center text-sm text-muted-foreground">Querying event fabric…</p>}
              {!isLoading &&
                grouped.map((g) => (
                  <div key={g.key} className="space-y-1">
                    {groupBy !== "none" && (
                      <p className="px-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {g.key} · {g.items.length}
                      </p>
                    )}
                    {g.items.map((e) => (
                      <div key={e.id} className="flex items-center gap-1">
                        <div className="flex-1">
                          <EventRow event={e} onSelect={setSelected} selected={selected?.id === e.id} />
                        </div>
                        <button
                          type="button"
                          aria-label="Bookmark event"
                          onClick={() =>
                            setBookmarks(bookmarks.includes(e.id) ? bookmarks.filter((b) => b !== e.id) : [...bookmarks, e.id])
                          }
                          className={cn("rounded px-1 text-xs", bookmarks.includes(e.id) ? "text-primary" : "text-muted-foreground")}
                        >
                          ★
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              {!isLoading && events.length === 0 && (
                <p className="py-16 text-center text-sm text-muted-foreground">No events match this query.</p>
              )}
            </div>
          </ScrollArea>
          {selected && (
            <p className="mt-2 text-xs text-muted-foreground">Inspecting: {humanizeName(selected.name)}</p>
          )}
        </CardContent>
      </Card>

      <EventInspector event={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} onSelectRelated={setSelected} />
    </div>
  );
}
