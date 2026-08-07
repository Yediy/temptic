import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Pin, PinOff, Clock, CheckCheck, Inbox as InboxIcon } from "lucide-react";
import { CHANNELS, CHANNEL_LABEL, PRIORITY_TONE, type CommChannel } from "@/lib/comms/fabric";
import { useCommsWorkspace, useMarkNotificationsRead, useUnifiedInbox } from "@/hooks/comms/use-comms";
import { AssistantPanel } from "@/components/comms/AssistantPanel";

const VIEWS = ["all", "unread", "mentions", "priority", "pinned", "snoozed"] as const;
type View = (typeof VIEWS)[number];

export default function CommsInbox() {
  const { items, isLoading, unreadCount } = useUnifiedInbox();
  const { state, togglePin, snooze, unsnooze, isSnoozed } = useCommsWorkspace();
  const markRead = useMarkNotificationsRead();
  const [view, setView] = useState<View>("all");
  const [channel, setChannel] = useState<CommChannel | "all">("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((i) => {
      if (!state.settings.showEvents && i.kind === "event") return false;
      if (state.settings.mutedChannels.includes(i.channel)) return false;
      if (channel !== "all" && i.channel !== channel) return false;
      if (view === "unread" && !i.unread) return false;
      if (view === "priority" && !["critical", "high"].includes(i.priority)) return false;
      if (view === "pinned" && !state.pinned.includes(i.id)) return false;
      if (view === "mentions" && !/@|assigned|approval|action required/i.test(`${i.title} ${i.preview}`)) return false;
      if (view === "snoozed" ? !isSnoozed(i.id) : isSnoozed(i.id)) return false;
      if (needle && !`${i.title} ${i.preview}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [items, view, channel, q, state, isSnoozed]);

  const context = filtered
    .slice(0, 40)
    .map((i) => `[${i.channel}/${i.priority}] ${i.title}: ${i.preview}`)
    .join("\n");

  return (
    <div className="grid gap-4 xl:grid-cols-[220px_1fr_340px]">
      <aside className="space-y-4">
        <Card>
          <CardContent className="space-y-1 p-3">
            {VIEWS.map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-sm capitalize transition-colors",
                  view === v ? "bg-muted font-semibold" : "text-muted-foreground hover:bg-muted/50",
                )}
              >
                {v}
                {v === "unread" && unreadCount > 0 && (
                  <span className="rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-1 p-3">
            <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Channels</p>
            <button
              onClick={() => setChannel("all")}
              className={cn(
                "w-full rounded-md px-2.5 py-1.5 text-left text-sm",
                channel === "all" ? "bg-muted font-semibold" : "text-muted-foreground hover:bg-muted/50",
              )}
            >
              All channels
            </button>
            {CHANNELS.map((c) => (
              <button
                key={c.key}
                onClick={() => setChannel(c.key)}
                className={cn(
                  "w-full rounded-md px-2.5 py-1.5 text-left text-sm",
                  channel === c.key ? "bg-muted font-semibold" : "text-muted-foreground hover:bg-muted/50",
                )}
              >
                {c.label}
              </button>
            ))}
          </CardContent>
        </Card>
      </aside>

      <section className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter this inbox…" className="max-w-sm" />
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              markRead.mutate(
                items.filter((i) => i.kind === "notification" && i.unread).map((i) => i.id.replace("notif-", "")),
              )
            }
          >
            <CheckCheck className="mr-1.5 h-3.5 w-3.5" /> Mark all read
          </Button>
        </div>

        <Card>
          <CardContent className="divide-y p-0">
            {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading the fabric…</p>}
            {!isLoading && !filtered.length && (
              <div className="flex flex-col items-center gap-2 p-10 text-center">
                <InboxIcon className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Nothing here. This view is clear.</p>
              </div>
            )}
            {filtered.slice(0, 200).map((i) => (
              <div
                key={i.id}
                className={cn(
                  "flex items-start gap-3 px-4 transition-colors hover:bg-muted/40",
                  state.settings.density === "compact" ? "py-2" : "py-3",
                  i.unread && "bg-primary/[0.03]",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {i.unread && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    <Link to={i.href ?? "#"} className="truncate text-sm font-medium hover:underline">
                      {i.title}
                    </Link>
                    <Badge variant="outline" className={cn("h-4 border px-1 text-[9px] uppercase", PRIORITY_TONE[i.priority])}>
                      {i.priority}
                    </Badge>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {CHANNEL_LABEL[i.channel]}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{i.preview}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(i.at), { addSuffix: true })}
                  </span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => togglePin(i.id)}>
                    {state.pinned.includes(i.id) ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => (isSnoozed(i.id) ? unsnooze(i.id) : snooze(i.id, 4))}
                    title={isSnoozed(i.id) ? "Unsnooze" : "Snooze 4 hours"}
                  >
                    <Clock className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <AssistantPanel context={`Unified inbox snapshot:\n${context}`} title="Inbox intelligence" />
    </div>
  );
}
