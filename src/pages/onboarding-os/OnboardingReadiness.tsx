import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useComputeReadiness } from "@/hooks/onboarding/use-onboarding-os";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function OnboardingReadiness() {
  const { agencyId } = useAuth();
  const compute = useComputeReadiness();
  const [selected, setSelected] = useState<string | null>(null);

  const { data: workers = [] } = useQuery({
    queryKey: ["workers-simple", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data } = await supabase.from("workers").select("id, first_name, last_name, email").eq("agency_id", agencyId!).order("first_name").limit(200);
      return data ?? [];
    },
  });

  const { data: readiness = [], refetch } = useQuery({
    queryKey: ["readiness", selected],
    enabled: !!selected,
    queryFn: async () => {
      const { data } = await supabase.from("assignment_readiness" as any).select("*").eq("worker_id", selected!).order("computed_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  return (
    <div className="p-4 md:p-6 grid gap-4 md:grid-cols-[280px_1fr]">
      <Card>
        <CardHeader><CardTitle className="text-sm">Workers</CardTitle></CardHeader>
        <CardContent className="p-0 max-h-[70vh] overflow-y-auto">
          {workers.map((w) => (
            <button
              key={w.id}
              onClick={() => setSelected(w.id)}
              className={`w-full text-left px-3 py-2 text-sm border-b hover:bg-muted ${selected === w.id ? "bg-muted" : ""}`}
            >
              {w.first_name} {w.last_name}
            </button>
          ))}
          {workers.length === 0 && <p className="p-3 text-xs text-muted-foreground">No workers.</p>}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {!selected ? (
          <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">Select a worker to view their assignment readiness.</CardContent></Card>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Assignment readiness</h2>
              <Button
                size="sm"
                disabled={compute.isPending}
                onClick={async () => { await compute.mutateAsync({ worker_id: selected }); refetch(); }}
              >
                {compute.isPending && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                Recompute
              </Button>
            </div>
            {readiness.length === 0 && (
              <Card><CardContent className="py-8 text-sm text-muted-foreground text-center">Not yet computed. Click Recompute.</CardContent></Card>
            )}
            {readiness.map((r) => (
              <Card key={r.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Score: {r.score}/100</CardTitle>
                    <Badge variant={r.ready ? "default" : "secondary"}>{r.ready ? "Ready" : "Not ready"}</Badge>
                  </div>
                  <Progress value={r.score} />
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(r.breakdown ?? {}).map(([k, v]: [string, any]) => (
                    <div key={k} className="flex items-center justify-between text-sm border-b py-1">
                      <span className="flex items-center gap-2">
                        {v.done ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-muted-foreground" />}
                        {v.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{v.weight} pts</span>
                    </div>
                  ))}
                  {(r.missing ?? []).length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs uppercase text-muted-foreground mb-1">Missing</p>
                      <div className="flex flex-wrap gap-1">
                        {(r.missing as any[]).map((m) => <Badge key={m.key} variant="outline">{m.label}</Badge>)}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
