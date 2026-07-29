import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAutomationRuns, useJobsQueue } from "@/hooks/automation/use-automation";
import { formatDistanceToNow } from "date-fns";
import { Activity, CheckCircle2, Loader2, XCircle } from "lucide-react";

type Job = { id: string; kind: string; status: string; attempts: number; max_attempts: number; created_at: string; last_error: string | null };

export default function LiveMonitor() {
  const runs = useAutomationRuns(100);
  const jobs = useJobsQueue();

  const queued = (jobs.data as Job[] | undefined ?? []).filter((j) => j.status === "queued");
  const running = (jobs.data as Job[] | undefined ?? []).filter((j) => j.status === "running");
  const failed = (jobs.data as Job[] | undefined ?? []).filter((j) => j.status === "failed");
  const succeeded = (jobs.data as Job[] | undefined ?? []).filter((j) => j.status === "succeeded");

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <StatTile label="Running" value={running.length} icon={Loader2} tone="info" />
        <StatTile label="Queued" value={queued.length} icon={Activity} />
        <StatTile label="Succeeded" value={succeeded.length} icon={CheckCircle2} tone="ok" />
        <StatTile label="Failed" value={failed.length} icon={XCircle} tone="err" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live automation runs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {(runs.data ?? []).map((r) => (
            <div key={r.id} className="grid grid-cols-[80px,1fr,120px,100px] items-center gap-3 rounded border p-2 text-xs">
              <Badge variant={r.status === "succeeded" ? "default" : "destructive"} className="justify-center">
                {r.status}
              </Badge>
              <code className="truncate font-mono text-muted-foreground">{r.automation_id.slice(0, 8)}…</code>
              <span className="text-muted-foreground">{r.duration_ms ?? "-"} ms</span>
              <span className="text-right text-muted-foreground">
                {formatDistanceToNow(new Date(r.ran_at), { addSuffix: true })}
              </span>
              {r.error && <div className="col-span-4 rounded bg-red-50 p-2 text-red-800">{r.error}</div>}
            </div>
          ))}
          {runs.data && runs.data.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Waiting for events…</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Background jobs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {(jobs.data as Job[] | undefined ?? []).map((j) => (
            <div key={j.id} className="grid grid-cols-[100px,1fr,80px,120px] items-center gap-3 rounded border p-2 text-xs">
              <Badge variant="outline">{j.kind}</Badge>
              <Badge
                variant={
                  j.status === "succeeded" ? "default" : j.status === "failed" ? "destructive" : "secondary"
                }
                className="w-fit"
              >
                {j.status}
              </Badge>
              <span className="text-muted-foreground">
                {j.attempts}/{j.max_attempts}
              </span>
              <span className="text-right text-muted-foreground">
                {formatDistanceToNow(new Date(j.created_at), { addSuffix: true })}
              </span>
              {j.last_error && <div className="col-span-4 rounded bg-red-50 p-2 text-red-800">{j.last_error}</div>}
            </div>
          ))}
          {(jobs.data as Job[] | undefined ?? []).length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No jobs.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "ok" | "err" | "info";
}) {
  const color =
    tone === "ok"
      ? "text-emerald-600 bg-emerald-50"
      : tone === "err"
        ? "text-red-600 bg-red-50"
        : tone === "info"
          ? "text-blue-600 bg-blue-50"
          : "text-foreground bg-muted";
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex h-9 w-9 items-center justify-center rounded-md ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xl font-semibold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
