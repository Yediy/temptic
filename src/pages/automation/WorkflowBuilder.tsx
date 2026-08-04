import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import WorkflowCanvas from "@/components/automation/WorkflowCanvas";
import { NODE_TYPES, TRIGGERS, CONDITION_OPERATORS, NODE_TYPE_MAP, type NodeKind } from "@/lib/automation/catalog";
import {
  EMPTY_GRAPH, autoLayout, compileGraph, createNode, estimatePerformance, isGraph,
  newId, validateGraph, type WorkflowGraph,
} from "@/lib/automation/graph";
import { useAutomationRules, useSaveRule, useSuggestAutomation, type AutomationRule } from "@/hooks/automation/use-automation";
import { Copy, Redo2, Save, Sparkles, Trash2, Undo2, Wand2 } from "lucide-react";

export default function WorkflowBuilder() {
  const rules = useAutomationRules();
  const save = useSaveRule();
  const ai = useSuggestAutomation();

  const [ruleId, setRuleId] = useState<string | null>(null);
  const [name, setName] = useState("Untitled workflow");
  const [description, setDescription] = useState("");
  const [history, setHistory] = useState<{ graph: WorkflowGraph; label: string }[]>([{ graph: EMPTY_GRAPH, label: "New" }]);
  const [cursor, setCursor] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");

  const graph = history[cursor].graph;
  const selected = graph.nodes.find((n) => n.id === selectedId) ?? null;

  const commit = useCallback(
    (next: WorkflowGraph, label: string) => {
      setHistory((h) => [...h.slice(0, cursor + 1).slice(-50), { graph: next, label }]);
      setCursor((c) => Math.min(c + 1, 50));
    },
    [cursor],
  );

  const addNode = useCallback(
    (kind: string, x: number, y: number) => {
      const node = createNode(kind as NodeKind, x, y);
      commit({ ...graph, nodes: [...graph.nodes, node] }, `Add ${node.label}`);
      setSelectedId(node.id);
    },
    [graph, commit],
  );

  const removeSelected = useCallback(() => {
    if (!selectedId) return;
    commit(
      {
        nodes: graph.nodes.filter((n) => n.id !== selectedId),
        edges: graph.edges.filter((e) => e.from !== selectedId && e.to !== selectedId),
      },
      "Delete node",
    );
    setSelectedId(null);
  }, [graph, selectedId, commit]);

  const duplicateSelected = useCallback(() => {
    if (!selected) return;
    const copy = { ...selected, id: newId(), x: selected.x + 40, y: selected.y + 40, label: `${selected.label} copy` };
    commit({ ...graph, nodes: [...graph.nodes, copy] }, "Duplicate node");
    setSelectedId(copy.id);
  }, [graph, selected, commit]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable) return;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
      else if (meta && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) { e.preventDefault(); setCursor((c) => Math.min(history.length - 1, c + 1)); }
      else if (meta && e.key.toLowerCase() === "d") { e.preventDefault(); duplicateSelected(); }
      else if (e.key === "Delete" || e.key === "Backspace") removeSelected();
      else if (e.key === "Escape") setSelectedId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [history.length, duplicateSelected, removeSelected]);

  function loadRule(rule: AutomationRule & { graph?: unknown }) {
    setRuleId(rule.id);
    setName(rule.name);
    setDescription(rule.description ?? "");
    const g = isGraph(rule.graph) ? rule.graph : EMPTY_GRAPH;
    setHistory([{ graph: g, label: "Loaded" }]);
    setCursor(0);
    setSelectedId(null);
  }

  function patchSelected(patch: Record<string, unknown>) {
    if (!selected) return;
    commit(
      { ...graph, nodes: graph.nodes.map((n) => (n.id === selected.id ? { ...n, ...patch, config: { ...n.config, ...(patch.config as object ?? {}) } } : n)) },
      "Edit node",
    );
  }

  const compiled = useMemo(() => compileGraph(graph), [graph]);
  const issues = useMemo(() => validateGraph(graph), [graph]);
  const perf = useMemo(() => estimatePerformance(graph), [graph]);
  const blocking = issues.filter((i) => i.level === "error");

  function publish(enabled: boolean) {
    if (blocking.length) {
      toast({ title: "Fix blocking issues first", description: blocking[0].message, variant: "destructive" });
      return;
    }
    save.mutate({
      id: ruleId ?? undefined,
      name,
      description,
      trigger_event: compiled.trigger_event,
      conditions: compiled.conditions,
      actions: compiled.actions,
      graph,
      enabled,
    } as Parameters<typeof save.mutate>[0]);
  }

  const groups = Array.from(new Set(NODE_TYPES.map((n) => n.group)));

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr_300px]">
      {/* Palette */}
      <Card className="order-2 lg:order-1">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Node palette</CardTitle></CardHeader>
        <CardContent className="p-2">
          <ScrollArea className="h-[560px] pr-2">
            {groups.map((g) => (
              <div key={g} className="mb-3">
                <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{g}</p>
                <div className="space-y-1">
                  {NODE_TYPES.filter((n) => n.group === g).map((n) => (
                    <button
                      key={n.kind}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("application/x-iwos-node", n.kind)}
                      onDoubleClick={() => addNode(n.kind, 120, 120)}
                      className="w-full rounded border bg-card px-2 py-1.5 text-left text-xs hover:bg-muted"
                      title={n.description}
                    >
                      {n.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Canvas */}
      <div className="order-1 space-y-3 lg:order-2">
        <div className="flex flex-wrap items-center gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 max-w-xs" placeholder="Workflow name" />
          <Select value={ruleId ?? "new"} onValueChange={(v) => {
            if (v === "new") { setRuleId(null); setName("Untitled workflow"); setDescription(""); setHistory([{ graph: EMPTY_GRAPH, label: "New" }]); setCursor(0); return; }
            const r = rules.data?.find((x) => x.id === v);
            if (r) loadRule(r as AutomationRule & { graph?: unknown });
          }}>
            <SelectTrigger className="h-9 w-56"><SelectValue placeholder="Open workflow" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="new">+ New workflow</SelectItem>
              {(rules.data ?? []).map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => setCursor((c) => Math.max(0, c - 1))} disabled={cursor === 0}><Undo2 className="mr-1 h-4 w-4" />Undo</Button>
          <Button size="sm" variant="outline" onClick={() => setCursor((c) => Math.min(history.length - 1, c + 1))} disabled={cursor >= history.length - 1}><Redo2 className="mr-1 h-4 w-4" />Redo</Button>
          <Button size="sm" variant="outline" onClick={() => commit(autoLayout(graph), "Auto-layout")}><Wand2 className="mr-1 h-4 w-4" />Auto-layout</Button>
          <Button size="sm" variant="outline" onClick={duplicateSelected} disabled={!selected}><Copy className="mr-1 h-4 w-4" />Duplicate</Button>
          <Button size="sm" variant="outline" onClick={removeSelected} disabled={!selected}><Trash2 className="mr-1 h-4 w-4" />Delete</Button>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => publish(false)} disabled={save.isPending}>Save draft</Button>
            <Button size="sm" onClick={() => publish(true)} disabled={save.isPending}><Save className="mr-1 h-4 w-4" />Publish</Button>
          </div>
        </div>

        <WorkflowCanvas graph={graph} selectedId={selectedId} onSelect={setSelectedId} onChange={commit} onAddNode={addNode} />

        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4" />WOIC workflow assistant</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              rows={2}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="When a carpenter completes OSHA training, automatically qualify them for commercial construction projects."
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => ai.run(aiPrompt)} disabled={!aiPrompt.trim() || ai.loading}>
                {ai.loading ? "Generating…" : "Generate workflow"}
              </Button>
              <Button size="sm" variant="outline" disabled={ai.loading || graph.nodes.length === 0}
                onClick={() => ai.run(`Explain, validate and optimize this IWOS workflow. Point out risks and best practices.\n${JSON.stringify(compiled)}`)}>
                Explain &amp; optimize
              </Button>
            </div>
            {ai.suggestion && (
              <pre className="max-h-56 overflow-auto rounded border bg-muted/40 p-2 text-[11px] leading-relaxed">{ai.suggestion}</pre>
            )}
            <p className="text-[11px] text-muted-foreground">
              Generation and execution run in the Automation Intelligence Engine — this canvas only configures them.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Inspector */}
      <div className="order-3 space-y-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Inspector</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!selected && <p className="text-xs text-muted-foreground">Select a node to configure it.</p>}
            {selected && (
              <>
                <div>
                  <Label className="text-xs">Label</Label>
                  <Input className="h-8" value={selected.label} onChange={(e) => patchSelected({ label: e.target.value })} />
                </div>
                <Badge variant="outline">{NODE_TYPE_MAP[selected.kind].label}</Badge>

                {selected.kind === "trigger" && (
                  <div>
                    <Label className="text-xs">Event</Label>
                    <Select value={String(selected.config.event ?? "")} onValueChange={(v) => patchSelected({ config: { event: v } })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TRIGGERS.map((t) => <SelectItem key={t.event} value={t.event}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(selected.kind === "condition" || selected.kind === "decision") && (
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">Field</Label>
                      <Input className="h-8" value={String(selected.config.field ?? "")} onChange={(e) => patchSelected({ config: { field: e.target.value } })} placeholder="payload.status" />
                    </div>
                    <div>
                      <Label className="text-xs">Operator</Label>
                      <Select value={String(selected.config.operator ?? "eq")} onValueChange={(v) => patchSelected({ config: { operator: v } })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CONDITION_OPERATORS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Value</Label>
                      <Input className="h-8" value={String(selected.config.value ?? "")} onChange={(e) => patchSelected({ config: { value: e.target.value } })} />
                    </div>
                  </div>
                )}

                {NODE_TYPE_MAP[selected.kind].actionType && (
                  <div>
                    <Label className="text-xs">Configuration (JSON)</Label>
                    <Textarea
                      rows={6}
                      className="font-mono text-[11px]"
                      defaultValue={JSON.stringify(selected.config, null, 2)}
                      onBlur={(e) => {
                        try {
                          patchSelected({ config: JSON.parse(e.target.value || "{}") });
                        } catch (err) {
                          toast({ title: "Invalid JSON", description: (err as Error).message, variant: "destructive" });
                        }
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Validation</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {issues.map((i, idx) => (
              <p key={idx} className={i.level === "error" ? "text-xs text-destructive" : i.level === "warning" ? "text-xs text-amber-500" : "text-xs text-muted-foreground"}>
                • {i.message}
              </p>
            ))}
            <p className="pt-2 text-[11px] text-muted-foreground">
              {perf.executableNodes} executable nodes · ~{perf.estimatedMs} ms · saves ~{perf.manualMinutesSaved} manual minutes per run
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Compiled rule</CardTitle></CardHeader>
          <CardContent>
            <pre className="max-h-48 overflow-auto rounded border bg-muted/40 p-2 text-[10px]">{JSON.stringify(compiled, null, 2)}</pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
