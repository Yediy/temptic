import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  useCognitiveRequests,
  useCognitiveStream,
  useOrgSnapshot,
  useReasoningTraces,
  useSecurityScan,
  useSimulate,
} from "@/hooks/woic/use-cognitive";
import { extractPartialReasoning, extractPartialReport } from "@/lib/woic/stream";

const REASON_KEYS = [["woic", "reasoning"]];
const BRIEF_KEYS = [["woic", "briefs"]];
const STAGES: Record<string, string> = {
  connecting: "Connecting…", started: "Starting…", gathering_context: "Gathering organizational context…",
  cache_hit: "Using cached result…", generating: "Thinking…", saving: "Saving results…",
};

function StageBadge({ stage, streaming }: { stage: string; streaming: boolean }) {
  if (!streaming) return null;
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
      {STAGES[stage] ?? stage}
    </span>
  );
}

function Pct({ v }: { v: unknown }) {
  const n = typeof v === "number" ? v : Number(v);
  return <span>{Number.isFinite(n) ? `${Math.round(n * 100)}%` : "—"}</span>;
}

export default function WoicCognitive() {
  const { agencyId } = useAuth();
  const [question, setQuestion] = useState("");
  const [scenario, setScenario] = useState("");
  const snapshot = useOrgSnapshot(agencyId ?? undefined);
  const traces = useReasoningTraces(agencyId ?? undefined, 20);
  const requests = useCognitiveRequests(agencyId ?? undefined, 25);
  const reason = useCognitiveStream("reason", REASON_KEYS);
  const simulate = useSimulate();
  const brief = useCognitiveStream("generate_report", BRIEF_KEYS);
  const explain = useCognitiveStream("explain");
  const [explainId, setExplainId] = useState<string | null>(null);
  const scan = useSecurityScan();

  const fail = (e: unknown) =>
    toast({ title: "Cognitive core error", description: e instanceof Error ? e.message : String(e), variant: "destructive" });

  const final = reason.data as
    | { conclusion?: string; confidence?: number; explanation?: string; steps?: Array<{ kind: string; content: string }>; risk?: { level?: string } }
    | undefined;
  const partial = extractPartialReasoning(reason.text);
  const result = final ?? (reason.isStreaming || reason.text ? { ...partial, confidence: undefined, risk: undefined } : undefined);
  const briefFinal = brief.data as { title?: string; summary?: string; sections?: Array<{ heading: string; body: string }> } | undefined;
  const briefView = briefFinal ?? (brief.text ? extractPartialReport(brief.text) : undefined);
  const explainText = (explain.data as { explanation?: string } | undefined)?.explanation ?? explain.text;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organizational Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {snapshot.isLoading && <p className="text-muted-foreground">Loading live context…</p>}
          {snapshot.data &&
            Object.entries(snapshot.data as Record<string, unknown>)
              .filter(([, v]) => v && typeof v === "object" && !Array.isArray(v))
              .flatMap(([group, vals]) =>
                Object.entries(vals as Record<string, number>).map(([k, v]) => (
                  <div key={`${group}.${k}`} className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground capitalize">{group} · {k.replace(/_/g, " ")}</p>
                    <p className="text-xl font-semibold">{v}</p>
                  </div>
                )),
              )}
        </CardContent>
      </Card>

      <Tabs defaultValue="reason">
        <TabsList>
          <TabsTrigger value="reason">Reason</TabsTrigger>
          <TabsTrigger value="simulate">Simulate</TabsTrigger>
          <TabsTrigger value="ops">Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="reason" className="space-y-3 pt-3">
          <Card>
            <CardHeader><CardTitle className="text-base">Cross-domain reasoning</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. Which clients are most at risk of churn next quarter and why?"
                rows={3}
              />
              <div className="flex items-center gap-3">
                <Button
                  disabled={!agencyId || !question.trim() || reason.isStreaming}
                  onClick={() => reason.start(agencyId!, { question, domain: "cross_domain" }).catch(fail)}
                >
                  {reason.isStreaming ? "Reasoning…" : "Run WOIC reasoning"}
                </Button>
                {reason.isStreaming && <Button variant="ghost" size="sm" onClick={reason.cancel}>Stop</Button>}
                <StageBadge stage={reason.stage} streaming={reason.isStreaming} />
              </div>

              {result && (
                <div className="space-y-2 rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    {result.confidence !== undefined && <Badge>Confidence <Pct v={result.confidence} /></Badge>}
                    {result.risk?.level && <Badge variant="secondary">Risk: {result.risk.level}</Badge>}
                    {reason.isStreaming && <Badge variant="outline">Live</Badge>}
                  </div>
                  <p className="font-medium">{result.conclusion}</p>
                  <ol className="list-decimal pl-5 text-sm text-muted-foreground space-y-1">
                    {(result.steps ?? []).map((s, i) => (
                      <li key={i}><span className="uppercase text-xs mr-1">{s.kind}</span>{s.content}</li>
                    ))}
                  </ol>
                  <p className="text-sm">{result.explanation}</p>
                </div>
              )}
              {reason.isStreaming && reason.text && !partial.steps.length && (
                <pre className="max-h-40 overflow-auto rounded bg-muted p-2 text-xs font-mono whitespace-pre-wrap">{reason.text}</pre>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Recent reasoning traces</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(traces.data ?? []).map((t) => (
                <div key={String(t.id)} className="rounded border p-2">
                  <p className="font-medium">{String(t.question)}</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-muted-foreground text-xs">
                      {String(t.domain)} · <Pct v={t.confidence} /> · {new Date(String(t.created_at)).toLocaleString()}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={explain.isStreaming}
                      onClick={() => {
                        setExplainId(String(t.id));
                        explain.start(agencyId!, { target_kind: "reasoning", target_id: t.id }).catch(fail);
                      }}
                    >
                      Explain
                    </Button>
                  </div>
                  {explainId === String(t.id) && (explainText || explain.isStreaming) && (
                    <div className="mt-2 rounded bg-muted p-2 text-sm whitespace-pre-wrap">
                      <StageBadge stage={explain.stage} streaming={explain.isStreaming} />
                      {explainText}
                      {explain.isStreaming && <span className="ml-0.5 animate-pulse">▍</span>}
                    </div>
                  )}
                </div>
              ))}
              {!traces.isLoading && !(traces.data ?? []).length && (
                <p className="text-muted-foreground">No reasoning traces yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulate" className="pt-3">
          <Card>
            <CardHeader><CardTitle className="text-base">Scenario simulation</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                placeholder="e.g. We lose our two largest clients but add 30 warehouse workers next month."
                rows={3}
              />
              <Button
                disabled={!agencyId || !scenario.trim() || simulate.isPending}
                onClick={() => simulate.mutate({ agency_id: agencyId!, scenario }, { onError: fail })}
              >
                {simulate.isPending ? "Simulating…" : "Run simulation"}
              </Button>
              {simulate.data && (
                <pre className="max-h-80 overflow-auto rounded border p-3 text-xs">
                  {JSON.stringify(simulate.data, null, 2)}
                </pre>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ops" className="space-y-3 pt-3">
          <Card>
            <CardHeader><CardTitle className="text-base">Cognitive operations</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={!agencyId || brief.isStreaming}
                onClick={() =>
                  brief.start(agencyId!, { kind: "morning" })
                    .then((d) => d && toast({ title: "Morning brief generated" }))
                    .catch(fail)}
              >
                {brief.isStreaming ? "Generating…" : "Generate morning brief"}
              </Button>
              <Button
                variant="outline"
                disabled={!agencyId || scan.isPending}
                onClick={() =>
                  scan.mutate({ agency_id: agencyId! }, {
                    onError: fail,
                    onSuccess: () => toast({ title: "Security scan complete" }),
                  })}
              >
                {scan.isPending ? "Scanning…" : "Run security intelligence scan"}
              </Button>
              <StageBadge stage={brief.stage} streaming={brief.isStreaming} />
            </CardContent>
          </Card>

          {briefView && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {briefView.title || "Morning brief"}
                  {brief.isStreaming && <Badge variant="outline">Live</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {briefView.summary && <p>{briefView.summary}</p>}
                {(briefView.sections ?? []).map((sec, i) => (
                  <div key={i}>
                    <p className="font-medium">{sec.heading}</p>
                    <p className="text-muted-foreground whitespace-pre-wrap">{sec.body}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Cognitive request log</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-xs">
              {(requests.data ?? []).map((r) => (
                <div key={String(r.id)} className="flex flex-wrap justify-between gap-2 border-b py-1">
                  <span className="font-mono">{String(r.service)}.{String(r.operation)}</span>
                  <span className="text-muted-foreground">
                    {String(r.status)} · {String(r.latency_ms ?? "—")}ms · {new Date(String(r.created_at)).toLocaleTimeString()}
                  </span>
                </div>
              ))}
              {!requests.isLoading && !(requests.data ?? []).length && (
                <p className="text-muted-foreground">No cognitive calls recorded yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
