import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HealthGrid } from "@/components/oic/HealthGrid";
import { useOicSnapshot, useOrganizationHealth } from "@/hooks/oic/use-oic";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";

export default function OrganizationHealthPage() {
  const { data: snap, isFetching } = useOicSnapshot();
  const health = useOrganizationHealth(snap);
  const org = health[0];
  const radar = health.slice(1).map((h) => ({ dimension: h.label.replace(/ (Health|Status|Progress|Performance)$/, ""), score: h.score }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Live organization score</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-6">
          <div className="text-6xl font-bold tabular-nums">{org?.score ?? 0}</div>
          <div className="text-sm text-muted-foreground">
            <p>Composite of 11 operational dimensions, recomputed continuously from module data.</p>
            <p className="mt-1">{isFetching ? "Refreshing…" : "Auto-refreshes every 60s"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Health radar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar} outerRadius="72%">
                <PolarGrid className="stroke-muted" />
                <PolarAngleAxis dataKey="dimension" fontSize={11} />
                <Tooltip />
                <Radar dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <HealthGrid items={health} />
    </div>
  );
}
