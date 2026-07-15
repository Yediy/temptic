import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function WoicLearning() {
  const { agencyId } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["woic", "learning_history", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("woic_learning_history")
        .select("*")
        .eq("agency_id", agencyId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card>
      <CardHeader><CardTitle>Learning Signals</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {data?.length === 0 && <p className="text-sm text-muted-foreground">No learning signals captured yet.</p>}
        {data?.map((s: any) => (
          <div key={s.id} className="rounded-md border p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{s.signal_type}</p>
              <Badge variant="outline">{s.source ?? "system"}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Subject: <span className="font-mono">{s.subject_entity}/{String(s.subject_id).slice(0, 8)}</span> · {new Date(s.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
