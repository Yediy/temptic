import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { History, RotateCcw } from "lucide-react";
import { diffSnapshots, canRollbackTo } from "@/lib/automation/diff";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

type Version = {
  id: string; automation_id: string; version: number; change_kind: string; rolled_back_to: number | null;
  snapshot: Record<string, unknown>; changed_by: string | null; note: string | null; created_at: string;
};
type Rule = { id: string; name: string; version: number };

const show = (v: unknown) => (v === null || v === undefined ? "—" : typeof v === "string" ? v : JSON.stringify(v, null, 2));
const kindClass: Record<string, string> = {
  create: "bg-primary/15 text-primary", update: "bg-muted text-foreground",
  rollback: "bg-accent text-accent-foreground", delete: "bg-destructive/15 text-destructive",
};

export default function VersionHistory() {
  const { agencyId, roles } = useAuth();
  const isAdmin = (roles as string[]).some((r) => r === "agency_admin" || r === "super_admin");
  const qc = useQueryClient();
  const [ruleId, setRuleId] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  const rules = useQuery({
    queryKey: ["automation-rules-lite", agencyId], enabled: !!agencyId,
    queryFn: async (): Promise<Rule[]> => {
      const { data, error } = await sb.from("ttos_automations").select("id,name,version").eq("agency_id", agencyId).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const deleted = useQuery({
    queryKey: ["automation-deleted", agencyId], enabled: !!agencyId,
    queryFn: async (): Promise<{ automation_id: string; snapshot: { name?: string } }[]> => {
      const { data, error } = await sb.from("ttos_automation_versions").select("automation_id,snapshot").eq("agency_id", agencyId).eq("change_kind", "delete");
      if (error) throw error;
      return data ?? [];
    },
  });

  const activeId = ruleId ?? rules.data?.[0]?.id ?? null;
  const current = rules.data?.find((r) => r.id === activeId) ?? null;

  const versions = useQuery({
    queryKey: ["automation-versions", activeId], enabled: !!activeId,
    queryFn: async (): Promise<Version[]> => {
      const { data, error } = await sb.from("ttos_automation_versions").select("*").eq("automation_id", activeId).order("version", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const list = versions.data ?? [];
  const sel = list.find((v) => v.version === selected) ?? list[0] ?? null;
  const prev = sel ? list.find((v) => v.version < sel.version) ?? null : null;
  const changes = useMemo(() => (sel ? diffSnapshots(prev?.snapshot ?? null, sel.snapshot) : []), [sel, prev]);

  const rollback = useMutation({
    mutationFn: async (target: number) => {
      const { data, error } = await sb.rpc("rollback_automation", { _automation_id: activeId, _target_version: target });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (newVersion, target) => {
      toast({ title: `Restored version ${target}`, description: `Saved as new version ${newVersion}.` });
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["automation-versions"] });
      qc.invalidateQueries({ queryKey: ["automation-rules-lite"] });
      qc.invalidateQueries({ queryKey: ["automation-rules"] });
    },
    onError: (e: Error) => toast({ title: "Rollback failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Version History</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Every change to a rule is saved as a new version. Rolling back restores an earlier version as a new one, so history is never erased.
      </p>

      <div className="grid gap-4 lg:grid-cols-[240px_280px_1fr]">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Rules</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {(rules.data ?? []).map((r) => (
              <button key={r.id} onClick={() => { setRuleId(r.id); setSelected(null); }}
                className={`w-full rounded px-2 py-1.5 text-left text-sm ${r.id === activeId ? "bg-primary/10 font-semibold text-primary" : "hover:bg-muted"}`}>
                {r.name} <span className="font-mono text-xs text-muted-foreground">v{r.version}</span>
              </button>
            ))}
            {(deleted.data ?? []).map((d) => (
              <button key={d.automation_id} onClick={() => { setRuleId(d.automation_id); setSelected(null); }}
                className={`w-full rounded px-2 py-1.5 text-left text-sm text-muted-foreground line-through ${d.automation_id === activeId ? "bg-muted" : "hover:bg-muted"}`}>
                {d.snapshot?.name ?? "Deleted rule"}
              </button>
            ))}
            {rules.data?.length === 0 && !deleted.data?.length && <p className="text-sm text-muted-foreground">No rules yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Versions</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {list.map((v) => (
              <button key={v.id} onClick={() => setSelected(v.version)}
                className={`w-full rounded border px-2 py-1.5 text-left text-sm ${sel?.id === v.id ? "border-primary" : "border-transparent hover:bg-muted"}`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono">v{v.version}</span>
                  <span className={`rounded px-1.5 text-xs capitalize ${kindClass[v.change_kind] ?? ""}`}>
                    {v.change_kind}{v.rolled_back_to ? ` → v${v.rolled_back_to}` : ""}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString()}</div>
              </button>
            ))}
            {activeId && list.length === 0 && !versions.isLoading && <p className="text-sm text-muted-foreground">No versions recorded.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">
              {sel ? <>Changes in v{sel.version}{prev ? ` (vs v${prev.version})` : " (first version)"}</> : "Select a version"}
            </CardTitle>
            {sel && current && isAdmin && canRollbackTo(sel, current.version) && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" disabled={rollback.isPending}><RotateCcw className="mr-1 h-4 w-4" />Roll back to v{sel.version}</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Restore version {sel.version}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      The rule's settings will match v{sel.version} and be saved as v{current.version + 1}. Current v{current.version} stays in history, so you can undo this.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => rollback.mutate(sel.version)}>Restore</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardHeader>
          <CardContent>
            {!current && sel && <Badge variant="destructive" className="mb-2">Rule deleted — history is read-only</Badge>}
            {sel && changes.length === 0 && <p className="text-sm text-muted-foreground">No setting changes in this version.</p>}
            <div className="space-y-3">
              {changes.map((c) => (
                <div key={c.field} className="rounded border">
                  <div className="border-b bg-muted px-2 py-1 font-mono text-xs font-semibold">{c.field}</div>
                  <div className="grid grid-cols-2 text-xs">
                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap bg-destructive/5 p-2 font-mono">{show(c.before)}</pre>
                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap bg-primary/5 p-2 font-mono">{show(c.after)}</pre>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
