import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useOicSnapshot, useRiskModel } from "@/hooks/oic/use-oic";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function riskTone(level: number) {
  if (level >= 60) return { label: "critical", bar: "bg-destructive", badge: "destructive" as const };
  if (level >= 30) return { label: "elevated", bar: "bg-warning", badge: "secondary" as const };
  return { label: "stable", bar: "bg-success", badge: "outline" as const };
}

export default function RiskCenter() {
  const { data: snap } = useOicSnapshot();
  const risks = useRiskModel(snap);
  const sorted = [...risks].sort((a, b) => b.level - a.level);
  const overall = Math.round(risks.reduce((s, r) => s + r.level, 0) / (risks.length || 1));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Aggregate risk index</p>
            <p className="mt-1 text-4xl font-bold tabular-nums">{overall}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Critical risks</p>
            <p className="mt-1 text-4xl font-bold tabular-nums text-destructive">
              {risks.filter((r) => r.level >= 60).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">AI prediction confidence</p>
            <p className="mt-1 text-4xl font-bold tabular-nums">{snap.predictions.avgConfidence}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Risk profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sorted.map((r) => ({ name: r.label.replace(" Risk", ""), level: r.level }))}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" fontSize={11} interval={0} angle={-25} textAnchor="end" height={70} />
                <YAxis fontSize={11} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="level" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {sorted.map((r) => {
          const tone = riskTone(r.level);
          return (
            <Card key={r.key}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{r.label}</p>
                  <Badge variant={tone.badge}>{tone.label}</Badge>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", tone.bar)} style={{ width: `${r.level}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {r.detail} · index {r.level}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
