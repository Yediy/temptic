import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/woic/AsyncState";
import { ConfidenceBar, ProjectionBadge } from "@/components/simulation/SimBits";
import { useToast } from "@/hooks/use-toast";
import {
  useRunSimulation, useSavedScenarios, useScenarioTranslation, useSimSettings,
  useSimulationPermissions,
} from "@/hooks/simulation/use-simulation";
import {
  SCENARIO_ENTITY_KINDS, SCENARIO_TEMPLATES, SIMULATION_MODES, TIME_HORIZONS,
  emptyScenario, scenarioFromTemplate, toEnginePayload,
  type ScenarioDefinition, type SimulationRecord, type TimeHorizon,
} from "@/lib/simulation/platform";

export default function ScenarioBuilder() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [settings] = useSimSettings();
  const { can } = useSimulationPermissions();
  const [def, setDef] = useState<ScenarioDefinition>(() => ({
    ...emptyScenario(),
    mode: settings.defaultMode,
    horizon: settings.defaultHorizon,
    confidence_threshold: settings.confidenceThreshold,
  }));
  const [nl, setNl] = useState("");
  const [result, setResult] = useState<SimulationRecord | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedScenarios, setSavedScenarios] = useSavedScenarios();
  const translation = useScenarioTranslation();
  const { run } = useRunSimulation();

  // Template / Decision Console / Automation Studio entry points.
  useEffect(() => {
    const key = params.get("template");
    const question = params.get("question");
    const origin = params.get("origin");
    if (key) {
      const t = SCENARIO_TEMPLATES.find((x) => x.key === key);
      if (t) setDef((d) => ({ ...scenarioFromTemplate(t), confidence_threshold: d.confidence_threshold }));
    }
    if (question) {
      setDef((d) => ({
        ...d,
        question,
        name: d.name || question.slice(0, 60),
        origin: origin === "decision_console" ? "decision_console" : origin === "automation_studio" ? "automation_studio" : d.origin,
      }));
    }
  }, [params]);

  const patch = (p: Partial<ScenarioDefinition>) => setDef((d) => ({ ...d, ...p }));

  const translate = async () => {
    const draft = await translation.translate(nl);
    if (!draft) return;
    setDef((d) => ({
      ...d,
      ...draft,
      question: draft.question || nl,
      name: draft.name || d.name || nl.slice(0, 60),
      variables: Array.isArray(draft.variables) ? draft.variables : d.variables,
      assumptions: Array.isArray(draft.assumptions) ? draft.assumptions : d.assumptions,
      entity_kinds: Array.isArray(draft.entity_kinds) ? draft.entity_kinds : d.entity_kinds,
      constraints: Array.isArray(draft.constraints) ? draft.constraints : d.constraints,
      policies: Array.isArray(draft.policies) ? draft.policies : d.policies,
      origin: "natural_language",
    }));
  };

  const execute = async () => {
    if (!def.question.trim()) {
      toast({ title: "Scenario question required", variant: "destructive" });
      return;
    }
    setBusy(true);
    setRunError(null);
    setResult(null);
    try {
      const record = await run(def);
      setResult(record);
      if (record) toast({ title: "Simulation complete", description: "Projected outcomes are ready." });
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Simulation engine unavailable.");
    } finally {
      setBusy(false);
    }
  };

  const saveScenario = () => {
    setSavedScenarios([{ ...def, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...savedScenarios].slice(0, 100));
    toast({ title: "Scenario saved", description: "Available under Saved." });
  };

  const toggleKind = (k: string) =>
    patch({ entity_kinds: def.entity_kinds.includes(k) ? def.entity_kinds.filter((x) => x !== k) : [...def.entity_kinds, k] });

  const listField = (key: "entities" | "policies" | "constraints") => (
    <Textarea
      rows={2}
      value={def[key].join("\n")}
      onChange={(e) => patch({ [key]: e.target.value.split("\n").filter(Boolean) } as Partial<ScenarioDefinition>)}
      placeholder="One per line"
      className="text-xs"
    />
  );

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Describe the scenario</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              rows={3}
              value={nl}
              onChange={(e) => setNl(e.target.value)}
              placeholder='e.g. "What happens if this project loses 20% of its workforce?"'
            />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={translation.pending || !nl.trim()} onClick={translate}>
                {translation.pending ? "Translating…" : "Translate with WOIC"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => navigate("/simulation/library")}>Browse templates</Button>
            </div>
            {translation.error && <ErrorState error={translation.error} />}
            <p className="text-[11px] text-muted-foreground">
              WOIC returns a structured scenario definition — review and edit it below before execution.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Scenario definition</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-xs md:col-span-2">
              <span className="text-muted-foreground">Name</span>
              <Input value={def.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Scenario name" />
            </label>
            <label className="space-y-1 text-xs md:col-span-2">
              <span className="text-muted-foreground">Question</span>
              <Textarea rows={2} value={def.question} onChange={(e) => patch({ question: e.target.value })} />
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">Simulation mode</span>
              <select value={def.mode} onChange={(e) => patch({ mode: e.target.value })}
                className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                {SIMULATION_MODES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">Time horizon</span>
              <select value={def.horizon} onChange={(e) => patch({ horizon: e.target.value as TimeHorizon })}
                className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                {TIME_HORIZONS.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">Confidence threshold ({def.confidence_threshold.toFixed(2)})</span>
              <input type="range" min={0} max={1} step={0.05} value={def.confidence_threshold}
                onChange={(e) => patch({ confidence_threshold: Number(e.target.value) })} className="w-full" />
            </label>
            <div className="space-y-1 text-xs">
              <span className="text-muted-foreground">Entities in scope</span>
              {listField("entities")}
            </div>
            <div className="space-y-1 text-xs">
              <span className="text-muted-foreground">Policies</span>
              {listField("policies")}
            </div>
            <div className="space-y-1 text-xs">
              <span className="text-muted-foreground">Constraints</span>
              {listField("constraints")}
            </div>
            <div className="space-y-1 text-xs md:col-span-2">
              <span className="text-muted-foreground">Input kinds</span>
              <div className="flex flex-wrap gap-1">
                {SCENARIO_ENTITY_KINDS.map((k) => (
                  <button key={k} type="button" onClick={() => toggleKind(k)}
                    className={`rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
                      def.entity_kinds.includes(k) ? "border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                    {k}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1 text-xs md:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Variables</span>
                <Button size="sm" variant="ghost" onClick={() => patch({ variables: [...def.variables, { key: "", value: "" }] })}>
                  Add variable
                </Button>
              </div>
              {def.variables.map((v, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={v.key} placeholder="key"
                    onChange={(e) => patch({ variables: def.variables.map((x, xi) => xi === i ? { ...x, key: e.target.value } : x) })} />
                  <Input value={v.value} placeholder="value"
                    onChange={(e) => patch({ variables: def.variables.map((x, xi) => xi === i ? { ...x, value: e.target.value } : x) })} />
                  <Button size="sm" variant="ghost" onClick={() => patch({ variables: def.variables.filter((_, xi) => xi !== i) })}>×</Button>
                </div>
              ))}
            </div>

            <div className="space-y-1 text-xs md:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Assumptions</span>
                <Button size="sm" variant="ghost"
                  onClick={() => patch({ assumptions: [...def.assumptions, { statement: "", source: "user", confidence: 0.6, editable: true, impact: "medium" }] })}>
                  Add assumption
                </Button>
              </div>
              {def.assumptions.map((a, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={a.statement} placeholder="Assumption"
                    onChange={(e) => patch({ assumptions: def.assumptions.map((x, xi) => xi === i ? { ...x, statement: e.target.value } : x) })} />
                  <select value={a.impact} aria-label="Impact"
                    onChange={(e) => patch({ assumptions: def.assumptions.map((x, xi) => xi === i ? { ...x, impact: e.target.value as "low" | "medium" | "high" } : x) })}
                    className="h-9 rounded-md border bg-background px-2 text-xs">
                    <option value="low">low</option><option value="medium">medium</option><option value="high">high</option>
                  </select>
                  <Button size="sm" variant="ghost" onClick={() => patch({ assumptions: def.assumptions.filter((_, xi) => xi !== i) })}>×</Button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button size="sm" disabled={busy || !can("create")} onClick={execute}>
                {busy ? "Running simulation…" : "Run simulation"}
              </Button>
              <Button size="sm" variant="outline" onClick={saveScenario}>Save scenario</Button>
              {!can("create") && <span className="self-center text-xs text-muted-foreground">Read-only access — creation requires the simulation creator capability.</span>}
            </div>
            {runError && <div className="md:col-span-2"><ErrorState error={runError} /></div>}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Engine payload</CardTitle></CardHeader>
          <CardContent>
            <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-2 text-[10px]">
              {JSON.stringify(toEnginePayload(def), null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Result</CardTitle>
            {result && <ProjectionBadge kind="PROJECTED" />}
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {!result ? <p className="text-xs text-muted-foreground">No projection yet.</p> : (
              <>
                <ConfidenceBar value={result.confidence} threshold={def.confidence_threshold} />
                <ul className="space-y-2">
                  {result.outcomes.map((o, i) => (
                    <li key={i} className="rounded-md border border-dashed border-sky-500/40 p-2">
                      <div className="flex justify-between gap-2 text-xs">
                        <Badge variant="outline" className="text-[10px]">{o.horizon}</Badge>
                        <span className="text-muted-foreground">p={o.probability.toFixed(2)}</span>
                      </div>
                      <p className="mt-1 text-xs">{o.description}</p>
                    </li>
                  ))}
                </ul>
                {result.recommendations.length > 0 && (
                  <div>
                    <p className="text-xs font-medium">WOIC recommendations</p>
                    <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                      {result.recommendations.map((r, i) => <li key={i}>• {r.action} — {r.impact}</li>)}
                    </ul>
                  </div>
                )}
                <Button size="sm" variant="outline" className="w-full"
                  onClick={() => navigate(`/simulation/timeline?sim=${result.id}`)}>
                  Open projected timeline
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
