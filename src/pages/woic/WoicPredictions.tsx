import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function WoicPredictions() {
  const { agencyId } = useAuth();

  const models = useQuery({
    queryKey: ["woic", "prediction_models"],
    queryFn: async () => {
      const { data, error } = await supabase.from("woic_prediction_models").select("*").limit(50);
      if (error) throw error;
      return data;
    },
  });

  const results = useQuery({
    queryKey: ["woic", "prediction_results", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("woic_prediction_results")
        .select("*")
        .eq("agency_id", agencyId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Registered Models</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {models.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {models.data?.map((m: any) => (
            <div key={m.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">{m.name}</p>
                <Badge variant={m.enabled ? "default" : "secondary"}>{m.enabled ? "enabled" : "disabled"}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{m.model_type} · v{m.version}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Predictions</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {results.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {results.data?.length === 0 && <p className="text-sm text-muted-foreground">No predictions yet.</p>}
          {results.data?.map((r: any) => (
            <div key={r.id} className="rounded-md border p-3">
              <p className="text-sm font-medium">{r.subject_entity}/{String(r.subject_id).slice(0, 8)}</p>
              <p className="text-xs text-muted-foreground">
                Score {typeof r.score === "number" ? r.score.toFixed(3) : "—"} · {new Date(r.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
