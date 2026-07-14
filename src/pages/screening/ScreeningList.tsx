import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

export default function ScreeningList() {
  const { agencyId } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["screening-orders", agencyId],
    enabled: !!agencyId,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("screening_orders")
        .select("*")
        .eq("agency_id", agencyId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" /> Screening
        </h1>
        <p className="text-sm text-muted-foreground">Background check orders and adverse action tracking.</p>
      </div>

      <Card className="p-3 border-yellow-500/40 bg-yellow-500/5 flex items-start gap-2 text-sm">
        <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
        <span>
          Mock provider active — screening results shown here are placeholder data, not real background checks. Configure a real
          provider before relying on this workflow.
        </span>
      </Card>

      {isLoading && <div className="text-sm text-muted-foreground">Loading orders…</div>}
      {error && <div className="text-sm text-destructive">Failed to load: {String(error)}</div>}
      {!isLoading && !error && data?.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No screening orders yet.
        </Card>
      )}

      <div className="space-y-2">
        {data?.map((o) => (
          <Card key={o.id} className="p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-medium truncate">Worker {String(o.worker_id).slice(0, 8)}</div>
              <div className="text-xs text-muted-foreground">
                {o.provider ?? "mock"} · created {new Date(o.created_at).toLocaleDateString()}
              </div>
            </div>
            <Badge variant="secondary">{o.status ?? "pending"}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
