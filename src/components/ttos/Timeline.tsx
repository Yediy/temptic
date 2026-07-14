import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

interface TimelineRow {
  id: string;
  module: string;
  name: string;
  metadata: Record<string, unknown>;
  created_at: string;
  actor_id: string | null;
}

export function Timeline({ entityType, entityId }: { entityType: string; entityId: string }) {
  const [rows, setRows] = useState<TimelineRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("ttos_timeline")
        .select("id, module, name, metadata, created_at, actor_id")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!cancelled) {
        setRows((data ?? []) as TimelineRow[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [entityType, entityId]);

  return (
    <Card>
      <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ol className="space-y-3">
            {rows.map((r) => (
              <li key={r.id} className="flex items-start gap-3 text-sm">
                <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.module} · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
