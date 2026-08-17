import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";
import { ProjectionBadge, SimulationSelect, useSelectedSimId } from "@/components/simulation/SimBits";
import { useSimulationHistory } from "@/hooks/simulation/use-simulation";
import { TIMELINE_GRAINS, projectedEvents, simName, type TimelineGrain } from "@/lib/simulation/platform";

export default function ProjectedTimeline() {
  const { records, isLoading, error } = useSimulationHistory(200);
  const [simId, setSimId] = useSelectedSimId();
  const [grain, setGrain] = useState<TimelineGrain>("month");

  const sim = records.find((r) => r.id === simId) ?? records[0] ?? null;
  const events = useMemo(() => (sim ? projectedEvents(sim) : []), [sim]);

  if (isLoading) return <LoadingState label="Loading projections…" />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="grid gap-3 lg:grid-cols-4">
      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Projection source</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <SimulationSelect records={records} value={sim?.id} onChange={setSimId} />
          <div>
            <p className="text-xs text-muted-foreground">Granularity</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {TIMELINE_GRAINS.map((g) => (
                <button key={g} type="button" onClick={() => setGrain(g)}
                  className={`rounded-full border px-2 py-0.5 text-[11px] capitalize transition-colors ${
                    g === grain ? "border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1 rounded-md border p-2 text-[11px]">
            <p className="font-medium">Legend</p>
            <div className="flex flex-wrap gap-1">
              <ProjectionBadge kind="ACTUAL" />
              <ProjectionBadge kind="PROJECTED" />
              <ProjectionBadge kind="COUNTERFACTUAL" />
              <ProjectionBadge kind="SIMULATED" />
            </div>
            <p className="text-muted-foreground">Real history is solid; every projection is dashed and labelled.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur lg:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {sim ? `Projected timeline — ${simName(sim)} (${grain})` : "Projected timeline"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!sim ? <EmptyState label="Run a simulation to see a projected timeline." /> : (
            <ol className="relative space-y-3 border-l pl-4">
              <li className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <div className="flex flex-wrap items-center gap-2">
                  <ProjectionBadge kind="ACTUAL" />
                  <span className="text-sm font-medium">Present state — simulation created</span>
                  <span className="text-xs text-muted-foreground">{new Date(sim.created_at).toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground">Recorded reality. Everything below this point is a projection.</p>
              </li>

              {!events.length ? <EmptyState label="The engine returned no projected events." /> : events.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border border-dashed border-sky-400 bg-background" />
                  <div className="rounded-md border border-dashed border-sky-500/40 bg-sky-500/5 p-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <ProjectionBadge kind={e.kind} />
                      <Badge variant="outline" className="text-[10px]">{e.horizon}</Badge>
                      <span className="text-xs text-muted-foreground">probability {(e.probability * 100).toFixed(0)}%</span>
                    </div>
                    <p className="mt-1 text-sm">{e.label}</p>
                    {Object.keys(e.metrics).length > 0 && (
                      <ul className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                        {Object.entries(e.metrics).map(([k, v]) => <li key={k} className="rounded border px-1.5 py-0.5">{k}: {String(v)}</li>)}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
