import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { BellOff, CheckCheck } from "lucide-react";
import { PRIORITY_TONE, normalizePriority, CHANNELS, channelForModule, type CommChannel } from "@/lib/comms/fabric";
import { useCommNotifications, useCommsWorkspace, useMarkNotificationsRead } from "@/hooks/comms/use-comms";

export default function CommsNotifications() {
  const { data: notifications = [], isLoading } = useCommNotifications();
  const markRead = useMarkNotificationsRead();
  const { state, setSettings } = useCommsWorkspace();
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<string>("all");

  const rows = useMemo(
    () =>
      notifications.filter((n) => {
        if (level !== "all" && normalizePriority(n.level) !== level) return false;
        if (q && !`${n.title} ${n.body ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      }),
    [notifications, level, q],
  );

  const toggleMute = (c: CommChannel) => {
    const muted = state.settings.mutedChannels.includes(c)
      ? state.settings.mutedChannels.filter((x) => x !== c)
      : [...state.settings.mutedChannels, c];
    setSettings({ mutedChannels: muted });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notifications…" className="max-w-sm" />
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
            <option value="all">All levels</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <Button variant="outline" onClick={() => markRead.mutate(rows.filter((n) => !n.read_at).map((n) => n.id))}>
            <CheckCheck className="mr-1.5 h-4 w-4" /> Mark all read
          </Button>
        </div>

        <Card>
          <CardContent className="divide-y p-0">
            {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading notifications…</p>}
            {!isLoading && !rows.length && <p className="p-6 text-sm text-muted-foreground">No notifications match this filter.</p>}
            {rows.map((n) => {
              const p = normalizePriority(n.level);
              return (
                <button
                  key={n.id}
                  onClick={() => !n.read_at && markRead.mutate([n.id])}
                  className={cn("flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/40", !n.read_at && "bg-primary/[0.03]")}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {!n.read_at && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      <p className="truncate text-sm font-medium">{n.title}</p>
                      <Badge variant="outline" className={cn("h-4 border px-1 text-[9px] uppercase", PRIORITY_TONE[p])}>{p}</Badge>
                      {n.entity_type && <span className="text-[10px] uppercase text-muted-foreground">{n.entity_type}</span>}
                    </div>
                    {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </span>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-1 p-3">
          <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Channel preferences</p>
          {CHANNELS.map((c) => {
            const muted = state.settings.mutedChannels.includes(c.key);
            return (
              <button
                key={c.key}
                onClick={() => toggleMute(c.key)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-muted/50",
                  muted && "text-muted-foreground",
                )}
              >
                <span className="truncate">{c.label}</span>
                {muted && <BellOff className="h-3.5 w-3.5" />}
              </button>
            );
          })}
          <p className="px-1 pt-2 text-[10px] text-muted-foreground">
            Muted channels stay out of the unified inbox. Escalation still applies to critical alerts.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
