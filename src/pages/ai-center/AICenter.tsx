import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const STATUS_COLORS: Record<string, string> = {
  succeeded: "bg-green-500/10 text-green-700 dark:text-green-400",
  failed: "bg-destructive/10 text-destructive",
  partial: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
};

export default function AICenter() {
  const { agencyId } = useAuth();

  const runs = useQuery({
    queryKey: ["ai-runs", agencyId],
    enabled: !!agencyId,
    queryFn: async (): Promise<Any[]> => {
      const { data, error } = await supabase.from("ai_runs" as never).select("*").eq("agency_id" as never, agencyId! as never).order("created_at" as never, { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as Any[];
    },
  });

  const parses = useQuery({
    queryKey: ["ai-parses", agencyId],
    enabled: !!agencyId,
    queryFn: async (): Promise<Any[]> => {
      const { data, error } = await supabase.from("resume_parse_runs").select("id, worker_id, provider, status, created_at").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-5 w-5" /> AI Center</h1>
        <p className="text-sm text-muted-foreground">Audit of every AI run: résumé parses, candidate matches, credential OCR. AI is suggestion-only — decisions always require a human.</p>
      </div>

      <section>
        <h2 className="font-semibold mb-2">Recent runs</h2>
        {runs.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!runs.isLoading && (runs.data?.length ?? 0) === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">No AI runs recorded yet.</Card>
        )}
        <div className="space-y-2">
          {runs.data?.map((r: Any) => (
            <Card key={r.id} className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.kind} {r.model && <span className="text-xs text-muted-foreground">· {r.model}</span>}</div>
                  <div className="text-xs text-muted-foreground truncate">{r.output_summary ?? r.input_summary ?? "—"}</div>
                </div>
                <Badge className={STATUS_COLORS[r.status] ?? ""}>{r.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString()}</div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-2">Résumé parses</h2>
        {parses.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!parses.isLoading && (parses.data?.length ?? 0) === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">No résumé parses yet.</Card>
        )}
        <div className="space-y-2">
          {parses.data?.map((p: Any) => (
            <Card key={p.id} className="p-3 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-sm">Worker #{String(p.worker_id).slice(0, 8)} · {p.provider}</div>
                <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</div>
              </div>
              <Badge variant="secondary">{p.status}</Badge>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
