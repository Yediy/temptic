import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ErrorState } from "@/components/woic/AsyncState";
import { EnforcementBadge, SourceBadge } from "@/components/optimization/OptBits";
import {
  useDraftDefinition, useOptSettings, useOptimizationPermissions, useOptimizationTranslation,
  useRunOptimization, useSavedDefinitions,
} from "@/hooks/optimization/use-optimization";
import {
  MEASUREMENT_METHODS, OBJECTIVE_CATALOG, OPTIMIZATION_MODES, OPTIMIZATION_TEMPLATES, TIME_HORIZONS,
  definitionFromTemplate, emptyDefinition, isLocked, newConstraint, newObjective, objectiveConflicts,
  sourceByKey, type MeasurementMethod, type Objective, type TimeHorizon,
} from "@/lib/optimization/platform";
import { useToast } from "@/hooks/use-toast";

export default function ObjectiveBuilder() {
  const [def, setDef] = useDraftDefinition();
  const [settings] = useOptSettings();
  const [saved, setSaved] = useSavedDefinitions();
  const { run } = useRunOptimization();
  const translation = useOptimizationTranslation();
  const permissions = useOptimizationPermissions();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [ask, setAsk] = useState(params.get("ask") ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const template = params.get("template");
    if (!template) return;
    const t = OPTIMIZATION_TEMPLATES.find((x) => x.key === template);
    if (t) setDef(definitionFromTemplate(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get("template")]);

  const conflicts = objectiveConflicts(def.objectives);
  const patchObjective = (id: string, p: Partial<Objective>) =>
    setDef({ ...def, objectives: def.objectives.map((o) => (o.id === id ? { ...o, ...p } : o)) });

  const translate = async () => {
    const result = await translation.translate(ask);
    if (!result) return;
    setDef({
      ...emptyDefinition(),
      ...def,
      name: result.name || def.name,
      question: result.question || ask,
      mode: result.mode || def.mode,
      horizon: (result.horizon as TimeHorizon) || def.horizon,
      entities: result.entities ?? def.entities,
      resources: result.resources ?? def.resources,
      objectives: (result.objectives ?? []).length
        ? (result.objectives ?? []).map((o) => ({ ...newObjective(o.key), ...o, id: crypto.randomUUID() }))
        : def.objectives,
      constraints: (result.constraints ?? []).length
        ? (result.constraints ?? []).map((c) => {
            const base = newConstraint(c.source);
            const spec = sourceByKey(c.source);
            return { ...base, ...c, id: crypto.randomUUID(), enforcement: spec.immutable ? spec.enforcement : (c.enforcement ?? base.enforcement) };
          })
        : def.constraints,
      origin: "natural_language",
    });
    toast({ title: "Structured optimization ready", description: "Review and edit before running." });
  };

  const execute = async () => {
    if (!permissions.can("create")) { toast({ title: "Not permitted", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const record = await run({ ...def, confidence_threshold: settings.confidenceThreshold });
      if (record) navigate(`/optimization/strategies?opt=${record.id}`);
    } catch (e) {
      toast({ title: "Optimization failed", description: e instanceof Error ? e.message : "Engine unavailable.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Natural language request</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Textarea rows={2} value={ask} onChange={(e) => setAsk(e.target.value)}
              placeholder="Reduce operating cost 10% without violating service or safety targets." />
            <Button size="sm" variant="outline" disabled={!ask.trim() || translation.pending} onClick={translate}>
              {translation.pending ? "Translating…" : "Translate with WOIC"}
            </Button>
            {translation.error && <ErrorState error={translation.error} />}
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Objectives ({def.objectives.length})</CardTitle>
            <div className="flex gap-1">
              <select aria-label="Add objective" value="" onChange={(e) => e.target.value && setDef({ ...def, objectives: [...def.objectives, newObjective(e.target.value)] })}
                className="h-8 rounded-md border bg-background px-2 text-xs">
                <option value="">Add objective…</option>
                {OBJECTIVE_CATALOG.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {def.objectives.map((o) => (
              <div key={o.id} className="rounded-md border p-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{o.label}</span>
                  <Badge variant="outline" className="text-[10px]">{o.direction}</Badge>
                  <Badge variant={o.mandatory ? "destructive" : "secondary"} className="text-[10px]">
                    {o.mandatory ? "mandatory" : "preferred"}
                  </Badge>
                  <Button size="sm" variant="ghost" className="ml-auto"
                    onClick={() => setDef({ ...def, objectives: def.objectives.filter((x) => x.id !== o.id) })}>Remove</Button>
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <label className="flex items-center gap-2">
                    Weight {o.weight.toFixed(2)}
                    <input type="range" min={0} max={1} step={0.05} value={o.weight} className="flex-1"
                      onChange={(e) => patchObjective(o.id, { weight: Number(e.target.value) })} />
                  </label>
                  <label className="flex items-center gap-2">
                    Priority
                    <input type="number" min={1} max={9} value={o.priority} aria-label={`${o.label} priority`}
                      className="h-8 w-16 rounded border bg-background px-2"
                      onChange={(e) => patchObjective(o.id, { priority: Number(e.target.value) })} />
                  </label>
                  <Input value={o.target} placeholder="Target (e.g. -10%)" className="h-8"
                    onChange={(e) => patchObjective(o.id, { target: e.target.value })} />
                  <Input value={o.threshold} placeholder="Threshold (e.g. ≥ 95%)" className="h-8"
                    onChange={(e) => patchObjective(o.id, { threshold: e.target.value })} />
                  <label className="flex items-center gap-2">
                    Horizon
                    <select value={o.horizon} aria-label={`${o.label} horizon`} className="h-8 rounded border bg-background px-2"
                      onChange={(e) => patchObjective(o.id, { horizon: e.target.value as TimeHorizon })}>
                      {TIME_HORIZONS.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </label>
                  <label className="flex items-center gap-2">
                    Measurement
                    <select value={o.measurement} aria-label={`${o.label} measurement`} className="h-8 flex-1 rounded border bg-background px-2"
                      onChange={(e) => patchObjective(o.id, { measurement: e.target.value as MeasurementMethod })}>
                      {MEASUREMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace(/_/g, " ")}</option>)}
                    </select>
                  </label>
                  <label className="flex items-center gap-2">
                    Mandatory
                    <Switch checked={o.mandatory} onCheckedChange={(v) => patchObjective(o.id, { mandatory: v })} />
                  </label>
                </div>
              </div>
            ))}
            {!def.objectives.length && <p className="text-xs text-muted-foreground">Add at least one objective.</p>}
          </CardContent>
        </Card>

        {conflicts.length > 0 && (
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-amber-500">Objective conflicts</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-xs">
              {conflicts.map((c, i) => <p key={i}><strong>{c.a} ↔ {c.b}</strong> — {c.reason}</p>)}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-3">
        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Optimization</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <Input value={def.name} placeholder="Name" onChange={(e) => setDef({ ...def, name: e.target.value })} />
            <Textarea rows={3} value={def.question} placeholder="What should be optimized?"
              onChange={(e) => setDef({ ...def, question: e.target.value })} />
            <label className="flex items-center justify-between gap-2">
              Mode
              <select value={def.mode} aria-label="Optimization mode" className="h-8 rounded border bg-background px-2"
                onChange={(e) => setDef({ ...def, mode: e.target.value })}>
                {OPTIMIZATION_MODES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </label>
            <label className="flex items-center justify-between gap-2">
              Horizon
              <select value={def.horizon} aria-label="Time horizon" className="h-8 rounded border bg-background px-2"
                onChange={(e) => setDef({ ...def, horizon: e.target.value as TimeHorizon })}>
                {TIME_HORIZONS.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </label>
            <Input value={def.entities.join(", ")} placeholder="Entities in scope (comma separated)"
              onChange={(e) => setDef({ ...def, entities: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
            <Input value={def.resources.join(", ")} placeholder="Resources in scope (comma separated)"
              onChange={(e) => setDef({ ...def, resources: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={busy || !def.question.trim() || !def.objectives.length} onClick={execute}>
                {busy ? "Optimizing…" : "Run optimization"}
              </Button>
              <Button size="sm" variant="outline"
                onClick={() => { setSaved([{ ...def, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...saved]); toast({ title: "Definition saved" }); }}>
                Save definition
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDef(emptyDefinition())}>Reset</Button>
            </div>
            {!permissions.can("create") && (
              <p className="text-amber-500">Your role can view optimizations but not run them.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Constraints in this definition</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-xs">
            {!def.constraints.length ? (
              <p className="text-muted-foreground">Baseline hard constraints always apply. Add more in the Constraint Center.</p>
            ) : def.constraints.map((c) => (
              <div key={c.id} className="flex items-center gap-2 rounded border p-1.5">
                <SourceBadge source={c.source} />
                <span className="flex-1 truncate">{c.statement || sourceByKey(c.source).description}</span>
                <EnforcementBadge level={c.enforcement} locked={isLocked(c)} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
