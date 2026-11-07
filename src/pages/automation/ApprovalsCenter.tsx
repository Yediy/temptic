import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAutomationRules, useToggleRule } from "@/hooks/automation/use-automation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { SENSITIVE_ACTIONS, canApprove, isSensitiveAction } from "@/lib/automation/sensitive-actions";
import { ShieldCheck, ShieldAlert, History } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const from = supabase.from as any;

function useMemberRoles(agencyId: string | null, userId?: string) {
  return useQuery({
    queryKey: ["my-agency-roles", agencyId, userId],
    enabled: !!agencyId && !!userId,
    queryFn: async (): Promise<string[]> => {
      const { data } = await from("agency_members").select("role").eq("agency_id", agencyId).eq("user_id", userId).eq("is_active", true);
      return (data ?? []).map((r: Row) => String(r.role));
    },
  });
}

export default function ApprovalsCenter() {
  const rules = useAutomationRules();
  const toggle = useToggleRule();
  const { agencyId, roles, user } = useAuth();
  const memberRoles = useMemberRoles(agencyId, user?.id);
  const myRoles = [...(roles as string[]), ...(memberRoles.data ?? [])];
  const qc = useQueryClient();
  const { toast } = useToast();
  const [rejecting, setRejecting] = useState<Row | null>(null);
  const [reason, setReason] = useState("");

  const actions = useQuery({
    queryKey: ["automation-action-approvals", agencyId],
    enabled: !!agencyId,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await from("automation_action_approvals").select("*").eq("agency_id", agencyId)
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
  const audit = useQuery({
    queryKey: ["automation-approval-audit", agencyId],
    enabled: !!agencyId,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await from("automation_approval_audit").select("*").eq("agency_id", agencyId)
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const decide = useMutation({
    mutationFn: async (v: { id: string; approve: boolean; reason?: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("decide_automation_action", {
        _approval_id: v.id, _approve: v.approve, _reason: v.reason ?? null,
      });
      if (error) throw error;
      return data as { ok: boolean; status?: string; error?: string };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["automation-action-approvals"] });
      qc.invalidateQueries({ queryKey: ["automation-approval-audit"] });
      if (res.ok) toast({ title: res.status === "executed" ? "Approved and run" : "Rejected" });
      else toast({
        title: res.error === "forbidden" ? "You don't have permission to decide this" : `Couldn't complete: ${res.error}`,
        variant: "destructive",
      });
      setRejecting(null); setReason("");
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const gated = (rules.data ?? []).filter((r) => r.require_approval);
  const pendingActions = (actions.data ?? []).filter((a) => a.status === "pending");
  const label = (t: string) => (isSensitiveAction(t) ? SENSITIVE_ACTIONS[t].label : t);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Sensitive actions waiting</p><p className="text-2xl font-semibold">{pendingActions.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Approval-gated workflows</p><p className="text-2xl font-semibold">{gated.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Workflows awaiting approval</p><p className="text-2xl font-semibold">{gated.filter((r) => !r.approved_at).length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Approved &amp; live</p><p className="text-2xl font-semibold">{gated.filter((r) => r.approved_at && r.enabled).length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><ShieldAlert className="h-4 w-4" />Sensitive actions</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(actions.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No sensitive actions yet. Drug tests, payroll generation and escalations from automations will wait here for sign-off.</p>
          )}
          {(actions.data ?? []).map((a) => {
            const allowed = canApprove(a.action_type, myRoles, a.required_roles);
            const expired = a.status === "pending" && new Date(a.expires_at) < new Date();
            return (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded border p-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{label(a.action_type)}</span>
                    <Badge variant={a.status === "pending" ? "secondary" : a.status === "executed" ? "default" : a.status === "failed" || a.status === "rejected" ? "destructive" : "outline"}>
                      {expired ? "expired" : a.status}
                    </Badge>
                    {a.context?.event_name && <Badge variant="outline">{a.context.event_name}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {a.context?.automation_name ?? "Automation"} · requested {new Date(a.created_at).toLocaleString()} · approvers: {(a.required_roles ?? []).join(", ")}
                  </p>
                  {a.decision_reason && <p className="text-xs">Reason: {a.decision_reason}</p>}
                  {a.status === "failed" && <p className="text-xs text-destructive">{a.result?.error}</p>}
                </div>
                {a.status === "pending" && !expired && (
                  allowed ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={decide.isPending} onClick={() => setRejecting(a)}>Reject</Button>
                      <Button size="sm" disabled={decide.isPending} onClick={() => decide.mutate({ id: a.id, approve: true })}>Approve &amp; run</Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Needs: {(a.required_roles ?? []).join(" / ")}</span>
                  )
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4" />Workflow approval queue</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {gated.length === 0 && <p className="text-sm text-muted-foreground">No workflows require approval right now.</p>}
          {gated.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 rounded border p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{r.name}</span>
                  <Badge variant="outline">{r.trigger_event}</Badge>
                  <Badge variant={r.approved_at ? "default" : "secondary"}>{r.approved_at ? "approved" : "pending"}</Badge>
                </div>
                {r.description && <p className="truncate text-xs text-muted-foreground">{r.description}</p>}
              </div>
              <Switch checked={r.enabled} onCheckedChange={(v) => toggle.mutate({ id: r.id, enabled: v })} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><History className="h-4 w-4" />Approval audit trail</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {(audit.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr><th className="p-2">When</th><th className="p-2">Action</th><th className="p-2">Event</th><th className="p-2">Who</th><th className="p-2">Roles</th><th className="p-2">Reason</th></tr>
              </thead>
              <tbody>
                {(audit.data ?? []).map((e) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="p-2 whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                    <td className="p-2">{label(e.action_type)}</td>
                    <td className="p-2"><Badge variant={e.event === "denied" || e.event === "failed" ? "destructive" : "outline"}>{e.event}</Badge></td>
                    <td className="p-2 font-mono text-xs">{e.actor_user_id ? String(e.actor_user_id).slice(0, 8) : "engine"}</td>
                    <td className="p-2 text-xs">{(e.actor_roles ?? []).join(", ") || "—"}</td>
                    <td className="p-2 text-xs max-w-[260px] truncate" title={e.reason ?? ""}>{e.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {rejecting && label(rejecting.action_type)}</DialogTitle>
            <DialogDescription>A reason is required and will be kept in the audit trail.</DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this being rejected?" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="destructive" disabled={!reason.trim() || decide.isPending}
              onClick={() => rejecting && decide.mutate({ id: rejecting.id, approve: false, reason })}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
