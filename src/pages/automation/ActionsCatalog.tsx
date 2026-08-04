import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ACTION_TYPES } from "@/lib/automation/catalog";
import { useAutomationRules } from "@/hooks/automation/use-automation";

export default function ActionsCatalog() {
  const rules = useAutomationRules();
  const usage = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rules.data ?? []) {
      for (const a of r.actions ?? []) {
        const t = String((a as { type?: string }).type ?? "unknown");
        m.set(t, (m.get(t) ?? 0) + 1);
      }
    }
    return m;
  }, [rules.data]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ACTION_TYPES.map((a) => (
          <Card key={a.type}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm">
                {a.label}
                <Badge variant={usage.get(a.type) ? "default" : "outline"}>{usage.get(a.type) ?? 0} uses</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">{a.description}</p>
              <div className="flex flex-wrap gap-1">
                {a.fields.map((f) => <code key={f} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{f}</code>)}
              </div>
              <code className="block text-[11px] text-muted-foreground">type: {a.type}</code>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Every action is executed by the Automation Intelligence Engine. Studio only configures the payload contract.
      </p>
    </div>
  );
}
