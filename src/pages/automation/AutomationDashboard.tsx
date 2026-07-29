import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAutomationAnalytics, useAutomationRules, useAutomationRuns } from "@/hooks/automation/use-automation";
import { formatDistanceToNow } from "date-fns";
import { Activity, CheckCircle2, PlayCircle, XCircle, Zap } from "lucide-react";

export default function AutomationDashboard() {
  const { totals } = useAutomationAnalytics();
  const rules = useAutomationRules();
  const runs = useAutomationRuns(10);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Active rules" value={`${totals.activeRules}/${totals.totalRules}`} icon={Zap} />
        <MetricCard label="Success rate" value={`${totals.successRate}%`} icon={CheckCircle2} tone="ok" />
        <MetricCard label="Total runs" value={totals.runs} icon={Activity} />
        <MetricCard label="Avg runtime" value={`${totals.avgMs} ms`} icon={PlayCircle} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent automations</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/automation/builder">Manage</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {(rules.data ?? []).slice(0, 6).map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-md border p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{r.name}</span>
                    <Badge variant={r.enabled ? "default" : "outline"}>{r.enabled ? "on" : "off"}</Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <code className="rounded bg-muted px-1 py-0.5">{r.trigger_event}</code>
                    <span>{r.actions.length} actions</span>
                    <span>·</span>
                    <span className="text-emerald-600">{r.success_count} ok</span>
                    <span className="text-red-600">{r.failure_count} fail</span>
                  </div>
                </div>
              </div>
            ))}
            {rules.data && rules.data.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No automations yet. Install a{" "}
                <Link to="/automation/templates" className="underline">
                  template
                </Link>{" "}
                to get started.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent runs</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/automation/monitor">Live monitor</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {(runs.data ?? []).slice(0, 8).map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-2 text-sm">
                  {r.status === "succeeded" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="font-mono text-xs text-muted-foreground">{r.automation_id.slice(0, 8)}</span>
                  {r.duration_ms != null && <span className="text-xs text-muted-foreground">{r.duration_ms}ms</span>}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(r.ran_at), { addSuffix: true })}
                </span>
              </div>
            ))}
            {runs.data && runs.data.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No runs yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "ok" | "warn";
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-md ${
            tone === "ok" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-foreground"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-semibold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
