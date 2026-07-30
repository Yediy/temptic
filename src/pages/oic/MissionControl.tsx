import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronUp, LayoutGrid, RotateCcw, Sparkles } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  OIC_WIDGETS,
  useLiveEventStream,
  useOicSnapshot,
  useOrganizationHealth,
  useRiskModel,
  useWidgetLayout,
  type WidgetKey,
} from "@/hooks/oic/use-oic";
import { HealthGrid, toneFor } from "@/components/oic/HealthGrid";
import { cn } from "@/lib/utils";

export default function MissionControl() {
  const { data: snap } = useOicSnapshot();
  const health = useOrganizationHealth(snap);
  const risks = useRiskModel(snap);
  const { visible, hidden, move, toggle, reset } = useWidgetLayout();
  const { events, connected } = useLiveEventStream(40);

  const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

  const kpis = [
    { l: "Revenue", v: money(snap.invoices.revenue) },
    { l: "Outstanding", v: money(snap.invoices.outstanding) },
    { l: "Payroll gross", v: money(snap.payroll.gross) },
    { l: "Hours logged", v: Math.round(snap.timeTickets.hours).toLocaleString() },
    { l: "Active workers", v: snap.workers.active },
    { l: "Open jobs", v: snap.jobs.open },
    { l: "Open tickets", v: snap.tickets.open },
    { l: "Automation runs", v: snap.automations.runs },
  ];

  const pipelineData = [
    { stage: "Pipeline", n: snap.pipeline.entries },
    { stage: "Open jobs", n: snap.jobs.open },
    { stage: "Needed", n: snap.jobs.needed },
    { stage: "Filled", n: snap.jobs.filled },
  ];

  const forecastData = Array.from({ length: 6 }, (_, i) => {
    const base = snap.invoices.revenue / 6 || 0;
    return { m: `M+${i + 1}`, revenue: Math.round(base * (1 + i * 0.06)) };
  });

  const eventBuckets = (() => {
    const map = new Map<string, number>();
    events.forEach((e) => map.set(e.module ?? "core", (map.get(e.module ?? "core") ?? 0) + 1));
    return [...map.entries()].map(([module, n]) => ({ module, n }));
  })();

  const widgets: Record<WidgetKey, JSX.Element> = {
    health: (
      <Panel title="Health Grid" wide>
        <HealthGrid items={health} compact />
      </Panel>
    ),
    kpis: (
      <Panel title="Executive KPIs" wide>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.l} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{k.l}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{k.v}</p>
            </div>
          ))}
        </div>
      </Panel>
    ),
    risks: (
      <Panel title="Risk Alerts">
        <div className="space-y-2">
          {[...risks]
            .sort((a, b) => b.level - a.level)
            .slice(0, 5)
            .map((r) => (
              <div key={r.key} className="flex items-center justify-between gap-3 rounded-md border p-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.detail}</p>
                </div>
                <Badge variant={r.level >= 60 ? "destructive" : r.level >= 30 ? "secondary" : "outline"}>{r.level}</Badge>
              </div>
            ))}
        </div>
      </Panel>
    ),
    events: (
      <Panel
        title="Live Event Feed"
        action={
          <Badge variant={connected ? "default" : "outline"} className="text-[10px]">
            {connected ? "live" : "polling"}
          </Badge>
        }
      >
        <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {events.slice(0, 20).map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5">
              <div className="min-w-0">
                <code className="text-xs">{e.name}</code>
                <p className="truncate text-[11px] text-muted-foreground">{e.module}</p>
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
              </span>
            </div>
          ))}
          {events.length === 0 && <Empty label="No operational events yet." />}
        </div>
      </Panel>
    ),
    pipeline: (
      <Panel title="Recruiting Pipeline">
        <ChartBox>
          <BarChart data={pipelineData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="stage" fontSize={11} />
            <YAxis fontSize={11} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="n" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartBox>
      </Panel>
    ),
    assignments: (
      <Panel title="Assignment Status">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="In flight" value={snap.tickets.open} />
          <Stat label="Signed" value={snap.tickets.signed} />
          <Stat label="Rejected" value={snap.tickets.rejected} tone="bad" />
          <Stat label="Time tickets pending" value={snap.timeTickets.pending} />
        </div>
      </Panel>
    ),
    financial: (
      <Panel title="Financial Overview">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Invoiced" value={money(snap.invoices.revenue)} />
          <Stat label="Outstanding" value={money(snap.invoices.outstanding)} tone="warn" />
          <Stat label="Overdue invoices" value={snap.invoices.overdue} tone="bad" />
          <Stat label="Payroll gross" value={money(snap.payroll.gross)} />
        </div>
      </Panel>
    ),
    heatmap: (
      <Panel title="Coverage Heat Map">
        <div className="grid grid-cols-6 gap-1.5">
          {health.map((h) => {
            const tone = toneFor(h.score);
            return (
              <div
                key={h.key}
                title={`${h.label}: ${h.score}`}
                className={cn("flex h-12 items-center justify-center rounded-md text-xs font-semibold text-white", tone.bar)}
                style={{ opacity: 0.35 + (h.score / 100) * 0.65 }}
              >
                {h.score}
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Each cell is a health dimension; intensity reflects score.</p>
      </Panel>
    ),
    insights: (
      <Panel title="AI Insights" action={<Sparkles className="h-4 w-4 text-muted-foreground" />}>
        <div className="space-y-2">
          {snap.recommendations.slice(0, 5).map((r) => (
            <div key={r.id} className="rounded-md border p-2.5">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{r.kind}</Badge>
                {r.score != null && <span className="text-xs text-muted-foreground">score {Math.round(r.score)}</span>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{r.why ?? "WOIC recommendation"}</p>
            </div>
          ))}
          {snap.recommendations.length === 0 && <Empty label="WOIC has no recommendations yet." />}
        </div>
      </Panel>
    ),
    timeline: (
      <Panel title="Operational Timeline">
        <ChartBox>
          <BarChart data={eventBuckets}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="module" fontSize={11} />
            <YAxis fontSize={11} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="n" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartBox>
      </Panel>
    ),
    compliance: (
      <Panel title="Compliance Timeline">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Open events" value={snap.compliance.open} tone={snap.compliance.open ? "bad" : "ok"} />
          <Stat label="Total tracked" value={snap.compliance.events} />
          <Stat label="Expired training" value={snap.training.expired} tone="warn" />
          <Stat label="Completed training" value={snap.training.completed} tone="ok" />
        </div>
      </Panel>
    ),
    forecast: (
      <Panel title="Future Forecasts">
        <ChartBox>
          <AreaChart data={forecastData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="m" fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip />
            <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} />
          </AreaChart>
        </ChartBox>
      </Panel>
    ),
  };

  const wideKeys: WidgetKey[] = ["health", "kpis"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Mission Control Wall — arrange the widgets you need.</p>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <LayoutGrid className="mr-2 h-4 w-4" /> Widgets
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover">
              <DropdownMenuLabel>Visible widgets</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {OIC_WIDGETS.map((w) => (
                <DropdownMenuCheckboxItem
                  key={w.key}
                  checked={!hidden.includes(w.key)}
                  onCheckedChange={() => toggle(w.key)}
                >
                  {w.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="mr-2 h-4 w-4" /> Reset
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {visible.map((key) => (
          <div key={key} className={cn("relative", wideKeys.includes(key) && "lg:col-span-2")}>
            <div className="absolute right-2 top-2 z-10 flex gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => move(key, -1)} aria-label="Move up">
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => move(key, 1)} aria-label="Move down">
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </div>
            {widgets[key]}
          </div>
        ))}
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
  action,
  wide,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <Card className={cn("h-full", wide && "w-full")}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pr-20">
        <CardTitle className="text-base">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ChartBox({ children }: { children: React.ReactElement }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: "ok" | "warn" | "bad" }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-xl font-semibold tabular-nums",
          tone === "ok" && "text-success",
          tone === "warn" && "text-warning",
          tone === "bad" && "text-destructive",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{label}</p>;
}
