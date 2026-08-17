import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { LoadingState } from "@/components/woic/AsyncState";
import { usePassport } from "@/hooks/passport/use-workforce-passport";
import {
  usePassportTimelineAggregate,
  TIMELINE_CATEGORIES,
  type AggregatedEvent,
  type TimelineCategory,
} from "@/hooks/passport/use-passport-timeline-aggregate";
import { cn } from "@/lib/utils";

const DOT: Record<TimelineCategory, string> = {
  onboarding: "bg-sky-500",
  verification: "bg-emerald-500",
  assignment: "bg-indigo-500",
  training: "bg-amber-500",
  credential: "bg-violet-500",
  compliance: "bg-rose-500",
  badge: "bg-yellow-500",
  system: "bg-muted-foreground",
};

function groupLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

export default function PassportTimelineView() {
  const { passportId } = useParams();
  const { data: passport } = usePassport(passportId);
  const { data: events, isLoading, isFetching, refetch } = usePassportTimelineAggregate(
    passportId,
    passport?.worker_id,
  );

  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Set<TimelineCategory>>(new Set());
  const [range, setRange] = useState<"all" | "30" | "90" | "365">("all");
  const [order, setOrder] = useState<"desc" | "asc">("desc");
  const [openId, setOpenId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const map = new Map<TimelineCategory, number>();
    for (const e of events ?? []) map.set(e.category, (map.get(e.category) ?? 0) + 1);
    return map;
  }, [events]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cutoff = range === "all" ? null : Date.now() - Number(range) * 86400000;
    const list = (events ?? []).filter((e) => {
      if (active.size && !active.has(e.category)) return false;
      if (cutoff && new Date(e.date).getTime() < cutoff) return false;
      if (!q) return true;
      return [e.title, e.description, e.status, e.source]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
    return order === "desc"
      ? list
      : [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events, query, active, range, order]);

  const grouped = useMemo(() => {
    const out: { label: string; items: AggregatedEvent[] }[] = [];
    for (const e of filtered) {
      const label = groupLabel(e.date);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(e);
      else out.push({ label, items: [e] });
    }
    return out;
  }, [filtered]);

  function toggle(cat: TimelineCategory) {
    setActive((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  if (isLoading) return <LoadingState />;

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm">Passport Timeline</CardTitle>
            <p className="text-xs text-muted-foreground">
              {filtered.length} of {events?.length ?? 0} milestones across onboarding, verifications,
              assignments, training, credentials and compliance.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "Refreshing…" : "Refresh"}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Search milestones…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-full sm:w-64"
          />
          <Select value={range} onValueChange={(v) => setRange(v as typeof range)}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          <Select value={order} onValueChange={(v) => setOrder(v as typeof order)}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Newest first</SelectItem>
              <SelectItem value="asc">Oldest first</SelectItem>
            </SelectContent>
          </Select>
          {active.size > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setActive(new Set())}>Clear filters</Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {TIMELINE_CATEGORIES.map((c) => {
            const on = active.has(c.key);
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => toggle(c.key)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors",
                  on ? "border-primary bg-primary/10 text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", DOT[c.key])} />
                {c.label}
                <span className="text-[10px] opacity-70">{counts.get(c.key) ?? 0}</span>
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent>
        {!filtered.length ? (
          <p className="text-sm text-muted-foreground">No milestones match the current filters.</p>
        ) : (
          <div className="space-y-6">
            {grouped.map((g) => (
              <div key={g.label}>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {g.label}
                </div>
                <ol className="relative space-y-3 border-l pl-5">
                  {g.items.map((e) => {
                    const open = openId === e.id;
                    return (
                      <li key={e.id} className="relative">
                        <span className={cn("absolute -left-[1.42rem] top-2 h-2.5 w-2.5 rounded-full ring-2 ring-background", DOT[e.category])} />
                        <button
                          type="button"
                          onClick={() => setOpenId(open ? null : e.id)}
                          className="w-full rounded-md border p-3 text-left transition-colors hover:bg-muted/50"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-medium">{e.title}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(e.date).toLocaleString()}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-[10px] capitalize">{e.category}</Badge>
                            {e.status && <span className="text-xs text-muted-foreground">{e.status}</span>}
                          </div>
                          {e.description && (
                            <p className="mt-1 text-xs text-muted-foreground">{e.description}</p>
                          )}
                          {open && (
                            <div className="mt-2 space-y-1 border-t pt-2 text-xs text-muted-foreground">
                              <div>Source: <code>{e.source}</code></div>
                              {e.metadata && Object.keys(e.metadata).length > 0 && (
                                <pre className="overflow-x-auto rounded bg-muted p-2 text-[10px]">
                                  {JSON.stringify(e.metadata, null, 2)}
                                </pre>
                              )}
                            </div>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
