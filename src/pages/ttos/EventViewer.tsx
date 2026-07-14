import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

type Row = {
  id: string;
  module: string;
  name: string;
  entity_type: string | null;
  entity_id: string | null;
  status: string;
  created_at: string;
  processed_at: string | null;
};

export default function EventViewer() {
  const { agencyId } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    if (!agencyId) return;
    (async () => {
      const { data } = await supabase
        .from("ttos_events")
        .select("id,module,name,entity_type,entity_id,status,created_at,processed_at")
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false })
        .limit(200);
      setRows((data ?? []) as Row[]);
    })();
  }, [agencyId]);

  return (
    <div className="max-w-5xl space-y-4">
      <h1 className="text-2xl font-semibold">Event viewer</h1>
      <Card>
        <CardHeader><CardTitle>Last 200 events</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-sm border-b py-2 last:border-0">
              <div>
                <span className="font-medium">{r.name}</span>{" "}
                <span className="text-xs text-muted-foreground">
                  {r.module}{r.entity_type ? ` · ${r.entity_type}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={r.processed_at ? "outline" : "secondary"}>{r.status}</Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          ))}
          {rows.length === 0 && <p className="text-sm text-muted-foreground">No events yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
