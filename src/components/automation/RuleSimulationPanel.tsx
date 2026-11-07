import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { contextFromEvent, simulateRule, type SimRule, type SimulationResult } from "@/lib/automation/simulate";
import { CheckCircle2, XCircle, ShieldAlert, FlaskConical } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

function show(v: unknown) {
  if (v === undefined) return "— (missing)";
  return typeof v === "string" ? `"${v}"` : JSON.stringify(v);
}

/** Builds a sample in the engine's context shape, either from a recent real event or the rule's trigger. */
export default function RuleSimulationPanel({ rule, allRules, sampleJson, setSampleJson }: {
  rule: SimRule; allRules: SimRule[]; sampleJson: string; setSampleJson: (s: string) => void;
}) {
  const { agencyId } = useAuth();
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const recent = useQuery({
    queryKey: ["sim-recent-events", agencyId, rule.trigger_event],
    enabled: !!agencyId,
    queryFn: async (): Promise<Row[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase.from as any)("ttos_events").select("id,name,module,entity_type,entity_id,agency_id,actor_id,metadata,created_at")
        .eq("agency_id", agencyId).order("created_at", { ascending: false }).limit(20);
      if (rule.trigger_event !== "*") q = q.eq("name", rule.trigger_event);
      const { data } = await q;
      return data ?? [];
    },
  });

  function applyTemplate() {
    setSampleJson(JSON.stringify({ event: { name: rule.trigger_event === "*" ? "manual.run" : rule.trigger_event, entity_type: null, entity_id: null }, payload: { status: "" }, actor: { id: null } }, null, 2));
  }

  function run() {
    setErr(null);
    try {
      const parsed = JSON.parse(sampleJson);
      if (!parsed?.event?.name) throw new Error('Sample must include event.name — use "Rule trigger template" or a recent event.');
      setResult(simulateRule(rule, { payload: {}, ...parsed }, allRules));
    } catch (e) {
      setErr((e as Error).message); setResult(null);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><FlaskConical className="h-4 w-4" />Rule simulation (engine logic)</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-xs">
        <p className="text-muted-foreground">Uses the same trigger, condition and action logic as the live engine. Nothing is saved or sent.</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={applyTemplate}>Rule trigger template</Button>
          <Select onValueChange={(id) => { const e = recent.data?.find((x) => x.id === id); if (e) setSampleJson(JSON.stringify(contextFromEvent(e), null, 2)); }}>
            <SelectTrigger className="h-8 w-56"><SelectValue placeholder={recent.data?.length ? "Load a recent real event" : "No recent matching events"} /></SelectTrigger>
            <SelectContent>
              {(recent.data ?? []).map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name} · {new Date(e.created_at).toLocaleString()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={run}>Simulate</Button>
        </div>
        {err && <p className="text-destructive">{err}</p>}

        {result && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={result.triggerMatched ? "default" : "destructive"}>Trigger {result.triggerMatched ? "matched" : "not matched"}</Badge>
              <Badge variant={result.conditionsPassed ? "default" : "destructive"}>Conditions {result.conditionsPassed ? "passed" : "failed"}</Badge>
              <Badge variant={result.willRun ? "default" : "secondary"}>{result.willRun ? "Would run" : "Would not run"}</Badge>
            </div>

            <div>
              <p className="mb-1 font-medium">Conditions</p>
              {result.conditions.length === 0 && <p className="text-muted-foreground">No conditions — always passes.</p>}
              {result.conditions.map((c, i) => (
                <div key={i} className="flex items-start gap-2 rounded border p-2">
                  {c.matched ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                  <div className="min-w-0 font-mono text-[11px]">
                    {i > 0 && <span className="uppercase text-muted-foreground">{c.joiner} </span>}
                    {c.field} {c.operator} {show(c.expected)}
                    <div className="text-muted-foreground">actual: {show(c.actual)}</div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <p className="mb-1 font-medium">Actions</p>
              {result.actions.length === 0 && <p className="text-muted-foreground">No actions would run.</p>}
              {result.actions.map((a) => (
                <div key={a.index} className="rounded border p-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{a.index + 1}. {a.type}</span>
                    <Badge variant={a.outcome === "execute" ? "default" : a.outcome === "await_approval" ? "secondary" : "outline"}>
                      {a.outcome === "await_approval" ? <span className="flex items-center gap-1"><ShieldAlert className="h-3 w-3" />needs approval</span> : a.outcome}
                    </Badge>
                  </div>
                  <p>{a.summary}</p>
                  <pre className="overflow-auto rounded bg-muted/40 p-1 text-[10px]">{JSON.stringify(a.details, null, 2)}</pre>
                </div>
              ))}
            </div>

            <div>
              <p className="mb-1 font-medium">Resulting events</p>
              {result.resultingEvents.length === 0 && <p className="text-muted-foreground">None.</p>}
              {result.resultingEvents.map((e, i) => (
                <div key={i} className="flex justify-between rounded border p-2"><code>{e.name}</code><span className="text-muted-foreground">{e.source}</span></div>
              ))}
              {result.cascades.map((c) => (
                <p key={c.event} className="mt-1 text-muted-foreground">
                  <code>{c.event}</code> would then trigger: {c.rules.length ? c.rules.join(", ") : "no other rules"}
                </p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
