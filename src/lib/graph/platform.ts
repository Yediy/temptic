// IWOS Platform Graph Explorer — Platform DNA / capability taxonomy (PDNA-5.7B).
// Pure declarative metadata. All graph logic lives behind the Platform Graph
// Intelligence APIs (`woic-graph`) — nothing here traverses or stores a graph.
import type { NodeType } from "@/hooks/graph/use-graph";

export type GraphLayoutMode = "force" | "radial" | "hierarchy" | "tree";

export interface VisualizationMode {
  key: string;
  label: string;
  layout: GraphLayoutMode;
  overlay: "none" | "heat" | "risk";
  hint: string;
}

/** Visualization modes exposed by the explorer (CapSpec-5.7B §Visualization). */
export const VISUALIZATION_MODES: VisualizationMode[] = [
  { key: "relationship", label: "Relationship", layout: "force", overlay: "none", hint: "Raw relationship topology" },
  { key: "force", label: "Force-directed", layout: "force", overlay: "heat", hint: "Physics layout with connection heat" },
  { key: "hierarchy", label: "Hierarchy", layout: "hierarchy", overlay: "none", hint: "Typed columns, top-down structure" },
  { key: "tree", label: "Tree", layout: "tree", overlay: "none", hint: "Breadth-first expansion from the hub" },
  { key: "radial", label: "Radial", layout: "radial", overlay: "none", hint: "Concentric rings per organism type" },
  { key: "timeline", label: "Timeline overlay", layout: "force", overlay: "heat", hint: "Time-travel to a point in history" },
  { key: "journey", label: "Journey", layout: "tree", overlay: "heat", hint: "Path a worker or record travelled" },
  { key: "career", label: "Career", layout: "radial", overlay: "heat", hint: "Skill and role adjacency" },
  { key: "compliance", label: "Compliance", layout: "hierarchy", overlay: "risk", hint: "Certification and regulation chains" },
  { key: "dependency", label: "Dependency", layout: "tree", overlay: "risk", hint: "What depends on what" },
  { key: "executive", label: "Executive", layout: "radial", overlay: "heat", hint: "High-signal, low-noise summary view" },
  { key: "risk", label: "Risk", layout: "force", overlay: "risk", hint: "Risk propagation from a selected node" },
  { key: "infrastructure", label: "Infrastructure", layout: "hierarchy", overlay: "none", hint: "Systems, equipment and services" },
];

export interface PlatformDomain {
  key: string;
  label: string;
  purpose: string;
  /** keywords matched against node-type key / category to scope the domain */
  keywords: string[];
  defaultMode: string;
}

/** Platform Organism domains — each is a scoped projection of the same graph. */
export const PLATFORM_DOMAINS: PlatformDomain[] = [
  {
    key: "organization", label: "Organization Graph",
    purpose: "Agencies, clients, sites and the commercial relationships between them.",
    keywords: ["agency", "client", "organization", "site", "location", "department"],
    defaultMode: "hierarchy",
  },
  {
    key: "worker", label: "Worker Graph",
    purpose: "Workers, skills, credentials and the assignments that connect them.",
    keywords: ["worker", "skill", "credential", "certification", "role", "candidate"],
    defaultMode: "career",
  },
  {
    key: "project", label: "Project Graph",
    purpose: "Jobs, projects, shifts, tickets and delivery dependencies.",
    keywords: ["project", "job", "job_order", "shift", "ticket", "assignment", "placement"],
    defaultMode: "dependency",
  },
  {
    key: "knowledge", label: "Knowledge Graph",
    purpose: "Policies, SOPs, regulations, training and documents.",
    keywords: ["knowledge", "policy", "document", "regulation", "training", "course", "article"],
    defaultMode: "compliance",
  },
  {
    key: "automation", label: "Automation Graph",
    purpose: "Automations, workflows, triggers and the records they act upon.",
    keywords: ["automation", "workflow", "rule", "agent", "job_run", "task"],
    defaultMode: "dependency",
  },
  {
    key: "communication", label: "Communication Graph",
    purpose: "Threads, messages, notifications and who talks to whom.",
    keywords: ["thread", "message", "communication", "notification", "conversation"],
    defaultMode: "relationship",
  },
  {
    key: "timeline", label: "Timeline Graph",
    purpose: "Historical projection — the graph as it existed at a point in time.",
    keywords: [],
    defaultMode: "timeline",
  },
  {
    key: "ai", label: "AI Agent Graph",
    purpose: "Cognitive agents, decisions, recommendations and their subjects.",
    keywords: ["ai", "agent", "decision", "recommendation", "prediction", "model"],
    defaultMode: "relationship",
  },
  {
    key: "platform", label: "Platform Domain Graph",
    purpose: "Every Platform Organism at once — the full ecosystem topology.",
    keywords: [],
    defaultMode: "executive",
  },
];

export function domainByKey(key?: string): PlatformDomain {
  return PLATFORM_DOMAINS.find((d) => d.key === key) ?? PLATFORM_DOMAINS[PLATFORM_DOMAINS.length - 1];
}

export function modeByKey(key?: string): VisualizationMode {
  return VISUALIZATION_MODES.find((m) => m.key === key) ?? VISUALIZATION_MODES[0];
}

/** Resolve a domain to concrete node-type keys using the live taxonomy. */
export function entityTypesForDomain(domain: PlatformDomain, nodeTypes: NodeType[]): string[] | undefined {
  if (!domain.keywords.length) return undefined;
  const hit = nodeTypes
    .filter((t) => domain.keywords.some((k) =>
      t.key.toLowerCase().includes(k) || (t.category ?? "").toLowerCase().includes(k)))
    .map((t) => t.key);
  return hit.length ? hit : undefined;
}

/** Impact-analysis scenarios (CapSpec-5.7B §Impact). */
export const IMPACT_SCENARIOS = [
  { key: "worker_leaves", label: "If this worker leaves…", prompt: "This worker becomes unavailable permanently." },
  { key: "policy_changes", label: "If this policy changes…", prompt: "This policy is rewritten with stricter requirements." },
  { key: "org_merges", label: "If this organization merges…", prompt: "This organization merges into another entity." },
  { key: "automation_fails", label: "If this automation fails…", prompt: "This automation stops executing silently." },
  { key: "project_slips", label: "If this project slips…", prompt: "This project slips by four weeks." },
  { key: "regulation_changes", label: "If this regulation changes…", prompt: "This regulation is tightened by the regulator." },
] as const;

/** WOIC capabilities surfaced in the explorer. */
export const WOIC_GRAPH_TASKS = [
  { key: "explain_relationships", label: "Explain relationships" },
  { key: "recommend_connections", label: "Recommend missing connections" },
  { key: "detect_patterns", label: "Detect unusual patterns" },
  { key: "identify_silos", label: "Identify organizational silos" },
  { key: "single_points_of_failure", label: "Single points of failure" },
  { key: "recommend_optimizations", label: "Recommend optimizations" },
  { key: "predict_cascade", label: "Predict cascading impacts" },
  { key: "executive_summary", label: "Generate executive summary" },
] as const;

export const SAVED_VIEWS_KEY = "iwos.graph.explorer.views.v1";
export const SETTINGS_KEY = "iwos.graph.explorer.settings.v1";

export interface SavedGraphView {
  id: string;
  name: string;
  domain: string;
  mode: string;
  types: string[];
  asOf: string;
  createdAt: string;
}

export interface ExplorerSettings {
  nodeLimit: number;
  labels: boolean;
  progressive: boolean;
  defaultMode: string;
}

export const DEFAULT_SETTINGS: ExplorerSettings = {
  nodeLimit: 500,
  labels: true,
  progressive: true,
  defaultMode: "relationship",
};

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...(JSON.parse(raw) as T) } : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}
