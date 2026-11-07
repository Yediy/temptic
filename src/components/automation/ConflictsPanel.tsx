import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { analyzeConflicts, type ConflictRule } from "@/lib/automation/conflicts";
import { GitMerge } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

export default function ConflictsPanel({ rules, focusId }: { rules: ConflictRule[]; focusId?: string }) {
  const { agencyId } = useAuth();
  const names = useMemo(() => new Map(rules.map((r) => [r.id, r.name])), [rules]);
  const findings = useMemo(() => {
    const all = analyzeConflicts(rules);
    return focusId ? all.filter((f) => f.rules.includes(focusId)) : all;
  }, [rules, focusId]);

  const suppressed = useQuery({
    queryKey: ["automation-suppressions", agencyId],
    enabled: !!agencyId,
    queryFn: async (): Promise<Row[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from as any)("ttos_automation_runs").select("id,automation_id,output,created_at,error")
        .eq("agency_id", agencyId).order("created_at", { ascending: false }).limit(200);
      return (data ?? []).flatMap((r: Row) =>
        (Array.isArray(r.output) ? r.output : []).filter((o: Row) => o?.suppressed).map((o: Row) => ({ ...o, run: r })));
    },
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm"><GitMerge className="h-4 w-4" />Conflicts &amp; race conditions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        {findings.length === 0 && <p className="text-muted-foreground">No overlapping, duplicate or contradictory automations found.</p>}
        {findings.map((f, i) => (
          <div key={i} className="rounded border p-2 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={f.level === "error" ? "destructive" : f.level === "warning" ? "secondary" : "outline"}>{f.kind}</Badge>
              <span>{f.message}</span>
            </div>
            <p className="text-muted-foreground">{f.resolution}</p>
          </div>
        ))}

        <p className="pt-2 font-medium">Recently blocked at runtime</p>
        {(suppressed.data ?? []).length === 0 && <p className="text-muted-foreground">Nothing blocked yet.</p>}
        {(suppressed.data ?? []).slice(0, 20).map((s, i) => (
          <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2">
            <span>
              <Badge variant="outline" className="mr-1">{s.suppressed}</Badge>
              {s.type ?? ""} from "{names.get(s.run.automation_id) ?? "rule"}"
              {s.winner_automation_id && <> — kept "{names.get(s.winner_automation_id) ?? "another rule"}"</>}
            </span>
            <span className="text-muted-foreground">{new Date(s.run.created_at).toLocaleString()}</span>
          </div>
        ))}
        <p className="pt-1 text-[11px] text-muted-foreground">
          The engine runs each action at most once per event chain, lets the higher-priority rule (lower number) win on duplicates
          or opposite outcomes, and stops chains that loop more than 5 times.
        </p>
      </CardContent>
    </Card>
  );
}
