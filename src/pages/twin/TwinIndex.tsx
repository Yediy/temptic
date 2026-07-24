import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState, EmptyState, ErrorState } from "@/components/woic/AsyncState";
import { Brain, ChevronRight } from "lucide-react";

export default function TwinIndex() {
  const { agencyId } = useAuth();
  const q = useQuery({
    queryKey: ["twin", "index_workers", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workers")
        .select("id, first_name, last_name, worker_twins(id, growth_score, career_health)")
        .eq("agency_id", agencyId!)
        .order("last_name")
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Digital Worker Twin</p>
        <h1 className="text-2xl font-semibold">Workforce Intelligence</h1>
        <p className="text-sm text-muted-foreground">
          Every worker has a continuously evolving AI twin that learns from assignments, training, and outcomes.
        </p>
      </header>

      <Card>
        <CardHeader><CardTitle className="text-base">Select a worker</CardTitle></CardHeader>
        <CardContent>
          {q.isLoading ? <LoadingState /> :
           q.error ? <ErrorState error={q.error} /> :
           !q.data?.length ? <EmptyState label="No workers in this agency yet." /> : (
            <ul className="divide-y">
              {q.data.map((w: any) => {
                const twin = Array.isArray(w.worker_twins) ? w.worker_twins[0] : w.worker_twins;
                return (
                  <li key={w.id}>
                    <Link
                      to={`/twin/${w.id}`}
                      className="flex items-center justify-between gap-3 py-3 hover:bg-muted/40 px-2 rounded"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Brain className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{`${w.first_name ?? ""} ${w.last_name ?? ""}`.trim() || "Unnamed"}</p>
                          <p className="text-xs text-muted-foreground">
                            {twin ? `Growth ${twin.growth_score ?? "—"} · Health ${twin.career_health ?? "—"}` : "No twin built yet"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </li>
                );
              })}
            </ul>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
