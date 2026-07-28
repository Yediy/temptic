import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export default function JobOrderCenter() {
  const { clientId } = useParams();
  const { data } = useQuery({
    enabled: !!clientId,
    queryKey: ["cc", "job_orders", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("job_orders").select("*").eq("client_id", clientId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Job Orders</h2>
      <div className="rounded-xl border bg-card divide-y">
        {(data ?? []).map((o) => (
          <div key={o.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium text-sm">{o.title}</p>
              <p className="text-xs text-muted-foreground">
                {o.positions_needed} positions · Priority {o.priority ?? "normal"}
              </p>
            </div>
            <Badge variant="outline">{o.status}</Badge>
          </div>
        ))}
        {!data?.length && <p className="p-6 text-sm text-muted-foreground">No job orders yet.</p>}
      </div>
    </div>
  );
}
