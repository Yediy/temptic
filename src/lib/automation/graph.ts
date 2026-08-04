// Workflow graph model + compiler. The graph is a *visual* representation; it
// compiles down to the trigger/conditions/actions contract the Automation
// Intelligence Engine already executes server-side. No execution happens here.
import { NODE_TYPE_MAP, type ConditionOperator, type NodeKind } from "./catalog";

export type WorkflowNode = {
  id: string;
  kind: NodeKind;
  label: string;
  x: number;
  y: number;
  collapsed?: boolean;
  group?: string | null;
  config: Record<string, unknown>;
};

export type WorkflowEdge = { id: string; from: string; to: string; label?: string };

export type WorkflowGraph = { nodes: WorkflowNode[]; edges: WorkflowEdge[] };

export const EMPTY_GRAPH: WorkflowGraph = { nodes: [], edges: [] };

export function isGraph(value: unknown): value is WorkflowGraph {
  const g = value as WorkflowGraph | null;
  return !!g && Array.isArray(g.nodes) && Array.isArray(g.edges);
}

export function newId(prefix = "n"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export const GRID = 20;
export const snap = (v: number) => Math.round(v / GRID) * GRID;

export function createNode(kind: NodeKind, x: number, y: number): WorkflowNode {
  const def = NODE_TYPE_MAP[kind];
  return {
    id: newId(),
    kind,
    label: def.label,
    x: snap(x),
    y: snap(y),
    group: null,
    config: kind === "trigger" ? { event: "worker.created" } : {},
  };
}

/** Deterministic layered auto-layout following edge direction from triggers. */
export function autoLayout(graph: WorkflowGraph): WorkflowGraph {
  const depth = new Map<string, number>();
  const roots = graph.nodes.filter((n) => n.kind === "trigger" || !graph.edges.some((e) => e.to === n.id));
  const queue = roots.map((n) => ({ id: n.id, d: 0 }));
  const seen = new Set<string>();
  while (queue.length) {
    const item = queue.shift()!;
    if (seen.has(item.id) && (depth.get(item.id) ?? 0) >= item.d) continue;
    seen.add(item.id);
    depth.set(item.id, Math.max(depth.get(item.id) ?? 0, item.d));
    for (const e of graph.edges.filter((x) => x.from === item.id)) queue.push({ id: e.to, d: item.d + 1 });
  }
  const perColumn = new Map<number, number>();
  const nodes = graph.nodes.map((n) => {
    const d = depth.get(n.id) ?? 0;
    const row = perColumn.get(d) ?? 0;
    perColumn.set(d, row + 1);
    return { ...n, x: snap(80 + d * 280), y: snap(80 + row * 140) };
  });
  return { ...graph, nodes };
}

export type CompiledRule = {
  trigger_event: string;
  conditions: Array<Record<string, unknown>>;
  actions: Array<Record<string, unknown>>;
};

/** Compile the visual graph into the engine's rule contract. */
export function compileGraph(graph: WorkflowGraph): CompiledRule {
  const trigger = graph.nodes.find((n) => n.kind === "trigger");
  const ordered = topoOrder(graph);
  const conditions: Array<Record<string, unknown>> = [];
  const actions: Array<Record<string, unknown>> = [];

  for (const node of ordered) {
    if (node.kind === "trigger" || node.kind === "comment") continue;
    if (node.kind === "condition" || node.kind === "decision") {
      conditions.push({
        node_id: node.id,
        join: (node.config.join as string) ?? "and",
        field: (node.config.field as string) ?? "payload.status",
        operator: ((node.config.operator as ConditionOperator) ?? "eq"),
        value: node.config.value ?? "",
      });
      continue;
    }
    const def = NODE_TYPE_MAP[node.kind];
    if (!def.actionType) continue;
    actions.push({
      node_id: node.id,
      type: def.actionType,
      node_kind: node.kind,
      label: node.label,
      ...node.config,
    });
  }

  return {
    trigger_event: (trigger?.config.event as string) ?? "manual.run",
    conditions,
    actions,
  };
}

function topoOrder(graph: WorkflowGraph): WorkflowNode[] {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const indegree = new Map(graph.nodes.map((n) => [n.id, 0]));
  for (const e of graph.edges) indegree.set(e.to, (indegree.get(e.to) ?? 0) + 1);
  const queue = graph.nodes.filter((n) => (indegree.get(n.id) ?? 0) === 0).map((n) => n.id);
  const out: WorkflowNode[] = [];
  const seen = new Set<string>();
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const node = byId.get(id);
    if (node) out.push(node);
    for (const e of graph.edges.filter((x) => x.from === id)) {
      indegree.set(e.to, (indegree.get(e.to) ?? 1) - 1);
      if ((indegree.get(e.to) ?? 0) <= 0) queue.push(e.to);
    }
  }
  // Append any nodes left out by cycles so nothing silently disappears.
  for (const n of graph.nodes) if (!seen.has(n.id)) out.push(n);
  return out;
}

export type ValidationIssue = { level: "error" | "warning" | "info"; message: string; nodeId?: string };

/** Dependency checker + conflict detector used by the Testing page. */
export function validateGraph(graph: WorkflowGraph): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const triggers = graph.nodes.filter((n) => n.kind === "trigger");
  if (triggers.length === 0) issues.push({ level: "error", message: "Workflow has no trigger node." });
  if (triggers.length > 1) issues.push({ level: "error", message: "Only one trigger node is supported per workflow." });

  const executable = graph.nodes.filter((n) => NODE_TYPE_MAP[n.kind].actionType);
  if (executable.length === 0) issues.push({ level: "warning", message: "No executable action nodes — the workflow will do nothing." });

  for (const n of graph.nodes) {
    if (n.kind === "trigger" || n.kind === "comment") continue;
    const connected = graph.edges.some((e) => e.to === n.id);
    if (!connected) issues.push({ level: "warning", message: `"${n.label}" is not connected to any upstream node.`, nodeId: n.id });
    if (n.kind === "webhook" && !n.config.url) issues.push({ level: "error", message: `"${n.label}" is missing a target URL.`, nodeId: n.id });
    if (n.kind === "ai" && !n.config.instruction) issues.push({ level: "warning", message: `"${n.label}" has no instruction for WOIC.`, nodeId: n.id });
    if ((n.kind === "condition" || n.kind === "decision") && !n.config.field)
      issues.push({ level: "error", message: `"${n.label}" has no field to evaluate.`, nodeId: n.id });
  }

  if (hasCycle(graph)) issues.push({ level: "error", message: "Cycle detected — workflow graph must be acyclic (use a Loop node instead)." });

  const parallels = graph.nodes.filter((n) => n.kind === "parallel").length;
  const merges = graph.nodes.filter((n) => n.kind === "merge").length;
  if (parallels > merges) issues.push({ level: "warning", message: "Parallel branches are not merged back — downstream ordering is undefined." });

  const approvals = graph.nodes.filter((n) => n.kind === "approval");
  for (const a of approvals) {
    if (!a.config.approver_role) issues.push({ level: "warning", message: `Approval "${a.label}" has no approver role.`, nodeId: a.id });
  }

  if (issues.length === 0) issues.push({ level: "info", message: "No issues detected. Workflow is ready to publish." });
  return issues;
}

function hasCycle(graph: WorkflowGraph): boolean {
  const state = new Map<string, 0 | 1 | 2>();
  const visit = (id: string): boolean => {
    const s = state.get(id) ?? 0;
    if (s === 1) return true;
    if (s === 2) return false;
    state.set(id, 1);
    for (const e of graph.edges.filter((x) => x.from === id)) if (visit(e.to)) return true;
    state.set(id, 2);
    return false;
  };
  return graph.nodes.some((n) => visit(n.id));
}

/** Rough, purely local performance estimate for the preview panel. */
export function estimatePerformance(graph: WorkflowGraph) {
  const costs: Partial<Record<NodeKind, number>> = {
    ai: 2400, api: 600, webhook: 700, payroll: 900, compliance: 800,
    document: 1200, communication: 400, approval: 0, delay: 0, timer: 0,
  };
  const exec = graph.nodes.filter((n) => NODE_TYPE_MAP[n.kind].actionType);
  const estimatedMs = exec.reduce((sum, n) => sum + (costs[n.kind] ?? 250), 0);
  const humanSteps = graph.nodes.filter((n) => ["approval", "communication", "document", "payroll"].includes(n.kind)).length;
  return {
    nodes: graph.nodes.length,
    executableNodes: exec.length,
    estimatedMs,
    manualMinutesSaved: humanSteps * 6,
    aiNodes: graph.nodes.filter((n) => n.kind === "ai").length,
  };
}

/** Decision-path preview used by simulation / dry-run. */
export function simulatePath(graph: WorkflowGraph, sample: Record<string, unknown>): { nodeId: string; label: string; outcome: string }[] {
  const order = topoOrder(graph);
  const steps: { nodeId: string; label: string; outcome: string }[] = [];
  let halted = false;
  for (const n of order) {
    if (n.kind === "comment") continue;
    if (halted) {
      steps.push({ nodeId: n.id, label: n.label, outcome: "skipped" });
      continue;
    }
    if (n.kind === "condition" || n.kind === "decision") {
      const field = String(n.config.field ?? "");
      const actual = field.split(".").reduce<unknown>((acc, key) => (acc as Record<string, unknown> | undefined)?.[key], sample);
      const passed = evaluate(actual, String(n.config.operator ?? "eq"), n.config.value);
      steps.push({ nodeId: n.id, label: n.label, outcome: passed ? "matched" : "not matched — branch stops" });
      if (!passed) halted = true;
      continue;
    }
    steps.push({ nodeId: n.id, label: n.label, outcome: n.kind === "trigger" ? "fired" : "would execute" });
  }
  return steps;
}

function evaluate(actual: unknown, operator: string, expected: unknown): boolean {
  const a = actual as string | number | undefined;
  const b = expected as string | number;
  switch (operator) {
    case "eq": return String(a) === String(b);
    case "neq": return String(a) !== String(b);
    case "gt": return Number(a) > Number(b);
    case "gte": return Number(a) >= Number(b);
    case "lt": return Number(a) < Number(b);
    case "lte": return Number(a) <= Number(b);
    case "in": return String(b).split(",").map((s) => s.trim()).includes(String(a));
    case "contains": return String(a ?? "").includes(String(b));
    case "before": return new Date(String(a)) < new Date(String(b));
    case "after": return new Date(String(a)) > new Date(String(b));
    default: return actual !== undefined;
  }
}
