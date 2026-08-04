import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAutomationRules, useToggleRule } from "@/hooks/automation/use-automation";
import { ShieldCheck } from "lucide-react";

export default function ApprovalsCenter() {
  const rules = useAutomationRules();
  const toggle = useToggleRule();
  const gated = (rules.data ?? []).filter((r) => r.require_approval);
  const pending = gated.filter((r) => !r.approved_at);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Approval-gated workflows</p><p className="text-2xl font-semibold">{gated.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Awaiting approval</p><p className="text-2xl font-semibold">{pending.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Approved &amp; live</p><p className="text-2xl font-semibold">{gated.filter((r) => r.approved_at && r.enabled).length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4" />Approval queue</CardTitle></CardHeader>
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
      <p className="text-xs text-muted-foreground">
        Approval decisions are recorded by the Automation Intelligence Engine; enabling a workflow here only changes its activation state.
      </p>
    </div>
  );
}
