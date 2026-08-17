import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/woic/AsyncState";
import { SCENARIO_TEMPLATES, TEMPLATE_DOMAINS, modeByKey } from "@/lib/simulation/platform";

export default function ScenarioLibrary() {
  const [q, setQ] = useState("");
  const [domain, setDomain] = useState("all");

  const templates = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return SCENARIO_TEMPLATES.filter((t) =>
      (domain === "all" || t.domain === domain) &&
      (!needle || `${t.label} ${t.question} ${t.domain}`.toLowerCase().includes(needle)));
  }, [q, domain]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates…" className="max-w-xs" />
        <select value={domain} onChange={(e) => setDomain(e.target.value)} aria-label="Domain"
          className="h-10 rounded-md border bg-background px-2 text-sm">
          <option value="all">All domains</option>
          {TEMPLATE_DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <span className="self-center text-xs text-muted-foreground">{templates.length} templates · configuration only</span>
      </div>

      {!templates.length ? <EmptyState label="No templates match." /> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.key} className="bg-card/60 backdrop-blur">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm">{t.label}</CardTitle>
                  <Badge variant="secondary" className="text-[10px]">{t.domain}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <p className="text-muted-foreground">{t.question || "Start from a blank definition."}</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px]">{modeByKey(t.mode).label}</Badge>
                  <Badge variant="outline" className="text-[10px]">{t.horizon}</Badge>
                  {t.entity_kinds.slice(0, 3).map((k) => <Badge key={k} variant="outline" className="text-[10px]">{k}</Badge>)}
                </div>
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link to={`/simulation/builder?template=${t.key}`}>Use template</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
