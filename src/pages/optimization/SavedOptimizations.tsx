import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/woic/AsyncState";
import { ModeBadge } from "@/components/optimization/OptBits";
import {
  useDraftDefinition, useOptimizationHistory, useSavedDefinitions, useSavedOptimizations,
} from "@/hooks/optimization/use-optimization";
import { optHorizon, optMode, optName } from "@/lib/optimization/platform";
import { useToast } from "@/hooks/use-toast";

export default function SavedOptimizations() {
  const { records, isLoading, error } = useOptimizationHistory();
  const [savedDefs, setSavedDefs] = useSavedDefinitions();
  const [savedIds, setSavedIds] = useSavedOptimizations();
  const [, setDraft] = useDraftDefinition();
  const navigate = useNavigate();
  const { toast } = useToast();

  if (isLoading) return <LoadingState label="Loading saved work…" />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Saved definitions ({savedDefs.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs">
          {savedDefs.length ? savedDefs.map((d) => (
            <div key={d.id} className="rounded border p-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex-1 truncate font-medium">{d.name || d.question || "Untitled definition"}</span>
                <ModeBadge mode={d.mode} />
                <Badge variant="outline" className="text-[10px]">{d.horizon}</Badge>
              </div>
              <p className="truncate text-muted-foreground">{d.question}</p>
              <p className="text-muted-foreground">
                {d.objectives.length} objectives · {d.constraints.length} constraints · saved {new Date(d.createdAt).toLocaleDateString()}
              </p>
              <div className="mt-1 flex gap-1">
                <Button size="sm" variant="outline"
                  onClick={() => { setDraft(d); toast({ title: "Loaded into Objective Builder" }); navigate("/optimization/objectives"); }}>
                  Load
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSavedDefs(savedDefs.filter((x) => x.id !== d.id))}>Delete</Button>
              </div>
            </div>
          )) : <EmptyState label="No saved definitions yet." />}
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Optimization results ({records.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs">
          {records.length ? records.map((r) => (
            <div key={r.id} className="rounded border p-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex-1 truncate font-medium">{optName(r)}</span>
                <ModeBadge mode={optMode(r)} />
                <Badge variant="outline" className="text-[10px]">{optHorizon(r)}</Badge>
                {savedIds.includes(r.id) && <Badge variant="secondary" className="text-[10px]">starred</Badge>}
              </div>
              <p className="text-muted-foreground">
                {r.strategies.length} strategies · {new Date(r.created_at).toLocaleString()}
              </p>
              <div className="mt-1 flex gap-1">
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/optimization/strategies?opt=${r.id}`}>Open strategies</Link>
                </Button>
                <Button size="sm" variant="ghost"
                  onClick={() => setSavedIds(savedIds.includes(r.id) ? savedIds.filter((x) => x !== r.id) : [r.id, ...savedIds])}>
                  {savedIds.includes(r.id) ? "Unstar" : "Star"}
                </Button>
              </div>
            </div>
          )) : <EmptyState label="No optimization results yet." />}
        </CardContent>
      </Card>
    </div>
  );
}
