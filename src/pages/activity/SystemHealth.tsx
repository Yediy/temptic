import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, AlertOctagon, Cpu, Gauge, Layers, RefreshCw, Timer } from "lucide-react";
import { useFabricHealth, useSubscribers } from "@/hooks/activity/use-event-fabric";

function Stat({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon: React.ElementType }) {
  return (
    <Card className="bg-card/60 backdrop-blur">
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
          {sub && <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>}
        </div>
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

export default function SystemHealth() {
  const { data, isLoading, refetch } = useFabricHealth();
  const { data: subscribers = [] } = useSubscribers();

  const max = Math.max(1, ...(data?.throughput ?? []).map((t) => t.count));
  const successRate = data && data.total24h > 0 ? Math.round(((data.total24h - data.failed24h) / data.total24h) * 100) : 100;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Events (24h)" value={String(data?.total24h ?? 0)} sub={`${data?.processed24h ?? 0} processed`} icon={Activity} />
        <Stat label="Avg latency" value={`${data?.avgLatencyMs ?? 0} ms`} sub="publish → processed" icon={Timer} />
        <Stat label="Queue depth" value={String(data?.queueDepth ?? 0)} sub={`${data?.retryQueue ?? 0} retrying`} icon={Layers} />
        <Stat label="Dead letter" value={String(data?.deadLetter ?? 0)} sub="unresolved failures" icon={AlertOctagon} />
        <Stat label="Failed events" value={String(data?.failed24h ?? 0)} sub={`${successRate}% success rate`} icon={Gauge} />
        <Stat label="AI processing" value={String(data?.aiRuns ?? 0)} sub={`${data?.aiFailures ?? 0} failures`} icon={Cpu} />
        <Stat label="Automation runs" value={String(data?.automationRuns ?? 0)} sub={`${data?.automationFailures ?? 0} failures`} icon={RefreshCw} />
        <Stat label="Subscribers" value={String(subscribers.length)} sub={`${subscribers.filter((s) => s.enabled).length} enabled`} icon={Layers} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Event throughput — last 24 hours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-40 items-end gap-1">
            {(data?.throughput ?? []).map((t) => (
              <div key={t.bucket} className="group flex flex-1 flex-col items-center justify-end gap-1" title={`${format(new Date(t.bucket), "PP HH:mm")} · ${t.count}`}>
                <span className="text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100">{t.count}</span>
                <span className="w-full rounded-t bg-primary/60 transition-colors group-hover:bg-primary" style={{ height: `${Math.max(3, (t.count / max) * 120)}px` }} />
                <span className="text-[8px] text-muted-foreground">{format(new Date(t.bucket), "HH")}</span>
              </div>
            ))}
            {isLoading && <p className="w-full text-center text-sm text-muted-foreground">Loading telemetry…</p>}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Module health</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(data?.moduleHealth ?? []).map((m) => {
              const health = m.total ? Math.round(((m.total - m.failed) / m.total) * 100) : 100;
              return (
                <div key={m.module} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono">{m.module}</span>
                    <span className="text-muted-foreground">{m.total} events · {health}% healthy</span>
                  </div>
                  <Progress value={health} className="h-1.5" />
                </div>
              );
            })}
            {(data?.moduleHealth ?? []).length === 0 && <p className="text-xs text-muted-foreground">No module traffic in the last 24h.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Subscriber health</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {subscribers.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded border px-2 py-1.5 text-xs">
                <span className="font-mono">{s.handler_key}</span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <code className="text-[10px]">{s.event_pattern}</code>
                  <Badge variant={s.enabled ? "outline" : "secondary"} className="text-[9px]">{s.enabled ? "healthy" : "paused"}</Badge>
                </span>
              </div>
            ))}
            {subscribers.length === 0 && <p className="text-xs text-muted-foreground">No subscribers registered.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
