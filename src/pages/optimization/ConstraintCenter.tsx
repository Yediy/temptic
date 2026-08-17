import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { EmptyState } from "@/components/woic/AsyncState";
import { ConstitutionNotice, EnforcementBadge, SourceBadge } from "@/components/optimization/OptBits";
import { useDraftDefinition, useOptimizationHistory } from "@/hooks/optimization/use-optimization";
import {
  BASELINE_CONSTRAINTS, CONSTRAINT_SOURCES, isLocked, newConstraint, optName, sourceByKey,
  type Constraint, type ConstraintEnforcement,
} from "@/lib/optimization/platform";

export default function ConstraintCenter() {
  const [def, setDef] = useDraftDefinition();
  const { records } = useOptimizationHistory();
  const [filter, setFilter] = useState("all");

  const patch = (id: string, p: Partial<Constraint>) =>
    setDef({ ...def, constraints: def.constraints.map((c) => (c.id === id ? { ...c, ...p } : c)) });

  const all = [...BASELINE_CONSTRAINTS, ...def.constraints];
  const visible = all.filter((c) => filter === "all" || c.source === filter);

  const binding = records.flatMap((r) =>
    r.strategies.flatMap((s) =>
      s.constraints.filter((c) => c.binding || !c.satisfied).map((c) => ({ ...c, opt: optName(r), strategy: s.name })),
    ),
  );

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        <ConstitutionNotice />

        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm">Constraints ({visible.length})</CardTitle>
            <div className="flex gap-1">
              <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by source"
                className="h-8 rounded-md border bg-background px-2 text-xs">
                <option value="all">All sources</option>
                {CONSTRAINT_SOURCES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <select value="" aria-label="Add constraint" className="h-8 rounded-md border bg-background px-2 text-xs"
                onChange={(e) => e.target.value && setDef({ ...def, constraints: [...def.constraints, newConstraint(e.target.value)] })}>
                <option value="">Add constraint…</option>
                {CONSTRAINT_SOURCES.filter((s) => !s.immutable).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {visible.map((c) => {
              const spec = sourceByKey(c.source);
              const locked = isLocked(c);
              const baseline = BASELINE_CONSTRAINTS.some((b) => b.id === c.id);
              return (
                <div key={c.id} className={locked ? "rounded-md border border-red-500/30 bg-red-500/5 p-2" : "rounded-md border p-2"}>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <SourceBadge source={c.source} />
                    <EnforcementBadge level={c.enforcement} locked={locked} />
                    {baseline && <Badge variant="outline" className="text-[10px]">platform baseline</Badge>}
                    {c.reference && <span className="text-muted-foreground">{c.reference}</span>}
                    {!baseline && (
                      <Button size="sm" variant="ghost" className="ml-auto"
                        onClick={() => setDef({ ...def, constraints: def.constraints.filter((x) => x.id !== c.id) })}>
                        Remove
                      </Button>
                    )}
                  </div>
                  {baseline ? (
                    <p className="mt-1 text-xs">{c.statement}</p>
                  ) : (
                    <Input className="mt-1 h-8 text-xs" value={c.statement} placeholder={spec.description}
                      onChange={(e) => patch(c.id, { statement: e.target.value })} />
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]">
                    {locked ? (
                      <span className="inline-flex items-center gap-1 text-red-400">
                        <Lock className="h-3 w-3" aria-hidden /> Inviolable — no weighting or relaxation available
                      </span>
                    ) : (
                      <>
                        <label className="flex items-center gap-2">
                          Enforcement
                          <select value={c.enforcement} aria-label="Enforcement level" className="h-7 rounded border bg-background px-1"
                            onChange={(e) => patch(c.id, { enforcement: e.target.value as ConstraintEnforcement })}>
                            <option value="SOFT">SOFT</option>
                            <option value="ADVISORY">ADVISORY</option>
                          </select>
                        </label>
                        <label className="flex flex-1 items-center gap-2">
                          Penalty {c.penalty.toFixed(2)}
                          <input type="range" min={0} max={1} step={0.05} value={c.penalty} className="flex-1"
                            onChange={(e) => patch(c.id, { penalty: Number(e.target.value) })} />
                        </label>
                        <label className="flex items-center gap-2">
                          Active <Switch checked={c.active} onCheckedChange={(v) => patch(c.id, { active: v })} />
                        </label>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {!visible.length && <EmptyState label="No constraints from this source." />}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Binding & violated (engine reported)</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-xs">
            {!binding.length ? <EmptyState label="No binding or violated constraints reported." /> :
              binding.slice(0, 25).map((b, i) => (
                <div key={i} className="rounded border p-1.5">
                  <div className="flex items-center gap-2">
                    <EnforcementBadge level={b.enforcement} />
                    <span className="flex-1 truncate">{b.label}</span>
                    <Badge variant={b.satisfied ? "secondary" : "destructive"} className="text-[10px]">
                      {b.satisfied ? "binding" : "violated"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{b.strategy} · {b.opt}</p>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Sources</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-[11px]">
            {CONSTRAINT_SOURCES.map((s) => (
              <div key={s.key} className="flex items-start gap-2">
                <EnforcementBadge level={s.enforcement} locked={s.immutable} />
                <span><strong>{s.label}</strong> — {s.description}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
