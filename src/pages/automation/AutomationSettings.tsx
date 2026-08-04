import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAutomationRules, useToggleRule } from "@/hooks/automation/use-automation";
import { LIBRARY_CATEGORIES } from "@/lib/automation/catalog";

export default function AutomationSettings() {
  const rules = useAutomationRules();
  const toggle = useToggleRule();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Workflow activation</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(rules.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No workflows yet.</p>}
          {(rules.data ?? []).map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 rounded border p-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.name}</p>
                <code className="text-[11px] text-muted-foreground">{r.trigger_event} · priority {r.priority}</code>
              </div>
              <Switch checked={r.enabled} onCheckedChange={(v) => toggle.mutate({ id: r.id, enabled: v })} />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Execution engine</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Runtime</span><Badge>Automation Intelligence Engine</Badge></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Event source</span><Badge variant="outline">Universal Event Fabric</Badge></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Intelligence</span><Badge variant="outline">WOIC Cognitive Core</Badge></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Failure handling</span><Badge variant="outline">Retry + dead letter</Badge></div>
            <p className="pt-2 text-xs text-muted-foreground">
              Studio never executes workflows locally — it only publishes configuration the engine consumes.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Library categories</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-1">
            {LIBRARY_CATEGORIES.map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
