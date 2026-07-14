import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Job = {
  id: string;
  kind: string;
  status: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
};

export default function JobsMonitor() {
  const [rows, setRows] = useState<Job[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("ttos_jobs")
        .select("id,kind,status,attempts,last_error,created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      setRows((data ?? []) as Job[]);
    })();
  }, []);

  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-2xl font-semibold">Background jobs</h1>
      <Card>
        <CardHeader><CardTitle>Recent jobs</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 && <p className="text-sm text-muted-foreground">No jobs.</p>}
          {rows.map((j) => (
            <div key={j.id} className="flex items-center justify-between border-b py-2 last:border-0 text-sm">
              <div>
                <span className="font-medium">{j.kind}</span>{" "}
                <span className="text-xs text-muted-foreground">attempts: {j.attempts}</span>
                {j.last_error && <p className="text-xs text-destructive">{j.last_error}</p>}
              </div>
              <Badge variant={j.status === "succeeded" ? "outline" : "secondary"}>{j.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
