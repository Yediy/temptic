import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, Download } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const escape = (v: unknown) => {
    if (v == null) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => escape(r[c])).join(","))].join("\n");
}

function download(name: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const { agencyId } = useAuth();

  const tickets = useQuery({
    queryKey: ["reports-tickets", agencyId],
    enabled: !!agencyId,
    queryFn: async (): Promise<Any[]> => {
      const { data, error } = await supabase.from("tickets").select("id, ticket_number, status, work_date, client_name_snapshot, worker_name_snapshot, total_hours").eq("agency_id", agencyId!).order("work_date", { ascending: false }).limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const jobs = useQuery({
    queryKey: ["reports-jobs", agencyId],
    enabled: !!agencyId,
    queryFn: async (): Promise<Any[]> => {
      const { data, error } = await supabase.from("job_orders" as never).select("*").eq("agency_id" as never, agencyId! as never).order("created_at" as never, { ascending: false }).limit(1000);
      if (error) throw error;
      return (data ?? []) as Any[];
    },
  });

  const training = useQuery({
    queryKey: ["reports-training", agencyId],
    enabled: !!agencyId,
    queryFn: async (): Promise<Any[]> => {
      const { data, error } = await supabase.from("training_enrollments").select("id, worker_id, course_id, status, progress_percent, completed_at").limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const sections = [
    { key: "tickets", label: "Tickets", q: tickets },
    { key: "jobs", label: "Job orders", q: jobs },
    { key: "training", label: "Training enrollments", q: training },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Reports</h1>
        <p className="text-sm text-muted-foreground">Cross-module data exports. RLS restricts results to your agency.</p>
      </div>

      <div className="grid gap-3">
        {sections.map(({ key, label, q }) => (
          <Card key={key} className="p-4 flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold">{label}</div>
              <div className="text-xs text-muted-foreground">
                {q.isLoading ? "Loading…" : q.error ? "Error loading" : `${q.data?.length ?? 0} rows`}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {q.data && q.data.length > 0 && <Badge variant="secondary">{q.data.length}</Badge>}
              <Button size="sm" variant="outline" disabled={!q.data || q.data.length === 0}
                onClick={() => download(`${key}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(q.data ?? []))}>
                <Download className="h-4 w-4 mr-1" /> CSV
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
