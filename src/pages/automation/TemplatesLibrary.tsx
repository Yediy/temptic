import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAutomationTemplates, useInstallTemplate } from "@/hooks/automation/use-automation";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

export default function TemplatesLibrary() {
  const q = useAutomationTemplates();
  const install = useInstallTemplate();
  const [search, setSearch] = useState("");

  const grouped = useMemo(() => {
    const filtered = (q.data ?? []).filter(
      (t) =>
        !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase()) ||
        t.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase())),
    );
    const map = new Map<string, typeof filtered>();
    for (const t of filtered) {
      const arr = map.get(t.category) ?? [];
      arr.push(t);
      map.set(t.category, arr);
    }
    return Array.from(map.entries());
  }, [q.data, search]);

  return (
    <div className="space-y-6">
      <Input
        placeholder="Search templates by name, category, or tag…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {grouped.map(([category, items]) => (
        <div key={category} className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{category}</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {items.map((t) => (
              <Card key={t.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between space-y-3">
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {t.trigger_event}
                      </Badge>
                      {t.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => install.mutate(t)}
                      disabled={install.isPending}
                    >
                      <Plus className="mr-1 h-3 w-3" /> Install
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
      {q.data && q.data.length === 0 && <p className="text-sm text-muted-foreground">No templates.</p>}
    </div>
  );
}
