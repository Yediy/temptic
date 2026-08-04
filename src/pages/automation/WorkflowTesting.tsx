import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useAutomationRules, useSuggestAutomation, type AutomationRule } from "@/hooks/automation/use-automation";
import { EMPTY_GRAPH, estimatePerformance, isGraph, simulatePath, validateGraph } from "@/lib/automation/graph";

const SAMPLE = JSON.stringify(
  { payload: { status: "approved", agency_id: "demo", compliance_status: "clear" }, actor: { role: "agency_admin" }, ai: { confidence: 0.91, recommendation: "approve" } },
  null,
  2,
);

export default function WorkflowTesting() {
  const rules = useAutomationRules();
  const ai = useSuggestAutomation();
  const [ruleId, setRuleId] = useState<string>("");
  const [sampleJson, setSampleJson] = useState(SAMPLE);
  const [mode, setMode] = useState<"dry-run" | "simulation">("dry-run");
  const [steps, setSteps] = useState<{ nodeId: string; label: string; outcome: string }[] | null>(null);

  const rule = (rules.data ?? []).find((r) => r.id === ruleId) as (AutomationRule & { graph?: unknown }) | undefined;
  const graph = isGraph(rule?.graph) ? rule!.graph : EMPTY_GRAPH;
  const issues = useMemo(() => validateGraph(graph), [graph]);
  const perf = useMemo(() => estimatePerformance(graph), [graph]);

  function run() {
    try {
      const sample = JSON.parse(sampleJson) as Record<string, unknown>;
      setSteps(simulatePath(graph, sample));
      toast({ title: mode === "dry-run" ? "Dry run complete" : "Simulation complete", description: "No side effects were executed." });
    } catch (e) {
      toast({ title: "Invalid sample JSON", description: (e as Error).message, variant: "destructive" });
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Test harness</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Select value={ruleId} onValueChange={setRuleId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select workflow" /></SelectTrigger>
              <SelectContent>{(rules.data ?? []).map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
              <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dry-run">Dry run</SelectItem>
                <SelectItem value="simulation">Simulation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea rows={10} className="font-mono text-[11px]" value={sampleJson} onChange={(e) => setSampleJson(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" onClick={run} disabled={!ruleId}>Run {mode}</Button>
            <Button size="sm" variant="outline" disabled={!ruleId || ai.loading}
              onClick={() => ai.run(`Explain what this IWOS workflow will do, its rollback behaviour and risks:\n${JSON.stringify({ trigger: rule?.trigger_event, conditions: rule?.conditions, actions: rule?.actions })}`)}>
              WOIC explanation
            </Button>
          </div>
          {ai.suggestion && <pre className="max-h-56 overflow-auto rounded border bg-muted/40 p-2 text-[11px]">{ai.suggestion}</pre>}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Execution &amp; decision preview</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {!steps && <p className="text-xs text-muted-foreground">Run a test to preview the decision path.</p>}
            {steps?.map((s, i) => (
              <div key={s.nodeId + i} className="flex items-center justify-between rounded border p-2 text-xs">
                <span>{i + 1}. {s.label}</span>
                <Badge variant={s.outcome === "skipped" ? "outline" : s.outcome.includes("not matched") ? "destructive" : "secondary"}>{s.outcome}</Badge>
              </div>
            ))}
            {steps && <p className="pt-2 text-[11px] text-muted-foreground">Rollback preview: no side effects were committed — this run never reached the engine.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Dependency &amp; conflict checks</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {issues.map((i, idx) => (
              <p key={idx} className={i.level === "error" ? "text-xs text-destructive" : i.level === "warning" ? "text-xs text-amber-500" : "text-xs text-muted-foreground"}>• {i.message}</p>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Performance estimate</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-xs">
            <div><p className="text-muted-foreground">Nodes</p><p className="text-lg font-semibold">{perf.nodes}</p></div>
            <div><p className="text-muted-foreground">Executable</p><p className="text-lg font-semibold">{perf.executableNodes}</p></div>
            <div><p className="text-muted-foreground">Estimated duration</p><p className="text-lg font-semibold">{perf.estimatedMs} ms</p></div>
            <div><p className="text-muted-foreground">Manual minutes saved</p><p className="text-lg font-semibold">{perf.manualMinutesSaved}</p></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
