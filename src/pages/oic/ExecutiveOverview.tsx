import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useOicSnapshot, useOrganizationHealth, useRiskModel } from "@/hooks/oic/use-oic";
import { toneFor } from "@/components/oic/HealthGrid";
import { cn } from "@/lib/utils";

export default function ExecutiveOverview() {
  const { data: snap } = useOicSnapshot();
  const health = useOrganizationHealth(snap);
  const risks = useRiskModel(snap);
  const org = health[0];
  const tone = toneFor(org?.score ?? 0);

  const topRisks = [...risks].sort((a, b) => b.level - a.level).slice(0, 3);
  const priorities = [
    snap.payroll.runs > snap.payroll.approved && `Approve ${snap.payroll.runs - snap.payroll.approved} pending payroll run(s)`,
    snap.timeTickets.pending > 0 && `Review ${snap.timeTickets.pending} pending time ticket(s)`,
    snap.compliance.open > 0 && `Resolve ${snap.compliance.open} open compliance event(s)`,
    snap.invoices.overdue > 0 && `Chase ${snap.invoices.overdue} overdue invoice(s)`,
    snap.automations.failures > 0 && `Clear ${snap.automations.failures} failed automation run(s)`,
  ].filter(Boolean) as string[];

  const bottlenecks = [
    snap.jobs.needed > snap.jobs.filled &&
      `${snap.jobs.needed - snap.jobs.filled} unfilled positions across ${snap.jobs.open} open orders`,
    snap.pipeline.entries === 0 && "No candidates currently in the recruiting pipeline",
    snap.training.expired > 0 && `${snap.training.expired} workers with expired training blocking placement`,
  ].filter(Boolean) as string[];

  const opportunities = [
    snap.workers.active > 0 && `${snap.workers.active} active workers available for redeployment`,
    snap.invoices.revenue > 0 && `Margin upside on $${Math.round(snap.invoices.revenue).toLocaleString()} of invoiced work`,
    snap.automations.runs > 0 && `${snap.automations.runs} automated executions removing manual work`,
  ].filter(Boolean) as string[];

  const automationSavings = Math.round(snap.automations.runs * 4.5);
  const trend = Array.from({ length: 6 }, (_, i) => ({
    m: `M+${i + 1}`,
    revenue: Math.round((snap.invoices.revenue / 6 || 0) * (1 + i * 0.06)),
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-6 p-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Current organization score</p>
            <p className={cn("text-6xl font-bold tabular-nums", tone.text)}>{org?.score ?? 0}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Kpi label="Revenue" value={`$${Math.round(snap.invoices.revenue).toLocaleString()}`} />
            <Kpi label="Outstanding" value={`$${Math.round(snap.invoices.outstanding).toLocaleString()}`} />
            <Kpi label="Automation savings" value={`${automationSavings} min`} />
            <Kpi label="AI confidence" value={`${snap.predictions.avgConfidence}%`} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Biggest risks">
          {topRisks.map((r) => (
            <Row key={r.key} text={r.label} detail={r.detail} badge={String(r.level)} destructive={r.level >= 60} />
          ))}
        </Section>

        <Section title="Highest priorities">
          {priorities.length ? priorities.map((p) => <Row key={p} text={p} />) : <Empty label="No urgent actions." />}
        </Section>

        <Section title="Hiring bottlenecks">
          {bottlenecks.length ? bottlenecks.map((b) => <Row key={b} text={b} />) : <Empty label="Recruiting is flowing." />}
        </Section>

        <Section title="Growth opportunities">
          {opportunities.length ? opportunities.map((o) => <Row key={o} text={o} />) : <Empty label="No opportunities detected." />}
        </Section>

        <Section
          title="AI recommendations"
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/woic/recommendations">Open WOIC</Link>
            </Button>
          }
        >
          {snap.recommendations.length ? (
            snap.recommendations
              .slice(0, 5)
              .map((r) => (
                <Row
                  key={r.id}
                  text={r.kind}
                  detail={r.why ?? undefined}
                  badge={r.score != null ? String(Math.round(r.score)) : undefined}
                />
              ))
          ) : (
            <Empty label="WOIC has not issued recommendations yet." />
          )}
        </Section>

        <Section title="Revenue trend & forecast">
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="m" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );
}

function Row({ text, detail, badge, destructive }: { text: string; detail?: string; badge?: string; destructive?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{text}</p>
        {detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
      </div>
      {badge && <Badge variant={destructive ? "destructive" : "outline"}>{badge}</Badge>}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{label}</p>;
}
