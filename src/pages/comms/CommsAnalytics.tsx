import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Timer, MessageSquare, Bot, HeartPulse } from "lucide-react";
import { CHANNEL_LABEL, type CommChannel } from "@/lib/comms/fabric";
import { useCommAnalytics } from "@/hooks/comms/use-comms";
import { AssistantPanel } from "@/components/comms/AssistantPanel";

export default function CommsAnalytics() {
  const a = useCommAnalytics();
  const max = Math.max(1, ...a.volume.map((v) => v.count));

  const stats = [
    { label: "Conversations", value: a.threads, icon: MessageSquare },
    { label: "Messages (recent)", value: a.messages, icon: BarChart3 },
    { label: "Avg response", value: a.avgResponseMin ? `${a.avgResponseMin}m` : "—", icon: Timer },
    { label: "AI utilization", value: `${a.aiUtilization}%`, icon: Bot },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-1 text-2xl font-semibold">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm"><HeartPulse className="h-4 w-4" /> Communication health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={a.health} />
            <p className="text-xs text-muted-foreground">
              {a.health}/100 — {a.unread} unread notifications, {a.openTasks} open communication tasks.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Message volume (14 days)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex h-40 items-end gap-1.5">
              {a.volume.map((v) => (
                <div key={v.day} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded-t bg-primary/70" style={{ height: `${(v.count / max) * 100}%` }} title={`${v.count} messages`} />
                  <span className="text-[9px] text-muted-foreground">{v.day}</span>
                </div>
              ))}
              {!a.volume.length && <p className="text-sm text-muted-foreground">No message volume yet.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Channel distribution</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {a.channels.map((c) => (
              <Badge key={c.channel} variant="secondary" className="text-xs">
                {CHANNEL_LABEL[c.channel as CommChannel] ?? c.channel}: {c.count}
              </Badge>
            ))}
            {!a.channels.length && <p className="text-sm text-muted-foreground">No channel activity yet.</p>}
          </CardContent>
        </Card>
      </div>

      <AssistantPanel
        title="Analytics intelligence"
        compact
        context={`Communication analytics: ${a.threads} threads, ${a.messages} messages, avg response ${a.avgResponseMin} minutes, ${a.unread} unread, ${a.openTasks} open tasks, AI utilization ${a.aiUtilization}%, health ${a.health}.`}
      />
    </div>
  );
}
