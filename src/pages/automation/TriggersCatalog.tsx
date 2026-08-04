import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TRIGGERS } from "@/lib/automation/catalog";
import { useAutomationRules } from "@/hooks/automation/use-automation";

export default function TriggersCatalog() {
  const rules = useAutomationRules();
  const [q, setQ] = useState("");
  const usage = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rules.data ?? []) m.set(r.trigger_event, (m.get(r.trigger_event) ?? 0) + 1);
    return m;
  }, [rules.data]);

  const categories = Array.from(new Set(TRIGGERS.map((t) => t.category)));
  const filtered = TRIGGERS.filter((t) => (t.label + t.event).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <Input placeholder="Search triggers…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {categories.map((c) => {
          const items = filtered.filter((t) => t.category === c);
          if (!items.length) return null;
          return (
            <Card key={c}>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{c}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {items.map((t) => (
                  <div key={t.event} className="flex items-center justify-between gap-2 rounded border p-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.label}</p>
                      <code className="text-[11px] text-muted-foreground">{t.event}</code>
                    </div>
                    <Badge variant={usage.get(t.event) ? "default" : "outline"}>{usage.get(t.event) ?? 0} in use</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Triggers are published by the Universal Event Fabric; the Automation Intelligence Engine matches them to workflows server-side.
      </p>
    </div>
  );
}
