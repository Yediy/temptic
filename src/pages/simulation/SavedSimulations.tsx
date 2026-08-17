import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";
import { ConfidenceBar, ModeBadge } from "@/components/simulation/SimBits";
import {
  useSavedResults, useSavedScenarios, useSimSettings, useSimulationHistory,
} from "@/hooks/simulation/use-simulation";
import { modeByKey, simMode, simName } from "@/lib/simulation/platform";

export default function SavedSimulations() {
  const { records, isLoading, error } = useSimulationHistory(200);
  const [saved, setSaved] = useSavedResults();
  const [scenarios, setScenarios] = useSavedScenarios();
  const [settings] = useSimSettings();

  if (isLoading) return <LoadingState label="Loading saved items…" />;
  if (error) return <ErrorState error={error} />;

  const savedRecords = records.filter((r) => saved.includes(r.id));

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Saved simulations ({savedRecords.length})</CardTitle></CardHeader>
        <CardContent>
          {!savedRecords.length ? <EmptyState label="Save a result from Simulation History to pin it here." /> : (
            <ul className="space-y-2">
              {savedRecords.map((s) => (
                <li key={s.id} className="rounded-md border p-2">
                  <div className="flex items-center justify-between gap-2">
                    <Link to={`/simulation/history?sim=${s.id}`} className="truncate text-sm hover:underline">{simName(s)}</Link>
                    <ModeBadge mode={simMode(s)} />
                  </div>
                  <div className="mt-1"><ConfidenceBar value={s.confidence} threshold={settings.confidenceThreshold} /></div>
                  <div className="mt-1 flex gap-1">
                    <Button asChild size="sm" variant="ghost"><Link to={`/simulation/timeline?sim=${s.id}`}>Timeline</Link></Button>
                    <Button asChild size="sm" variant="ghost"><Link to={`/simulation/impact?sim=${s.id}`}>Impact</Link></Button>
                    <Button size="sm" variant="ghost" onClick={() => setSaved(saved.filter((x) => x !== s.id))}>Remove</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Saved scenarios ({scenarios.length})</CardTitle></CardHeader>
        <CardContent>
          {!scenarios.length ? <EmptyState label="Save a scenario definition from the Scenario Builder." /> : (
            <ul className="space-y-2">
              {scenarios.map((s) => (
                <li key={s.id} className="rounded-md border p-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{s.name || s.question}</span>
                    <Badge variant="outline" className="text-[10px]">{modeByKey(s.mode).label}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-muted-foreground">{s.question}</p>
                  <div className="mt-1 flex gap-1">
                    <Button asChild size="sm" variant="ghost">
                      <Link to={`/simulation/builder?question=${encodeURIComponent(s.question)}`}>Open in builder</Link>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setScenarios(scenarios.filter((x) => x.id !== s.id))}>Delete</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
