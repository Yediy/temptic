// IWOS Platform Optimization Workspace — declarative platform metadata (PDNA-5.8D).
//
// This module contains NO optimization logic. It defines the vocabulary the UI
// speaks (objectives, constraints, strategy shapes) and the transport payload
// sent to the Platform Optimization Engine (`woic-cognitive`). Every strategy,
// Pareto point, sensitivity reading and risk shown in the workspace is produced
// by the engine and persisted in the existing cognitive store — the workspace
// never solves, ranks or fabricates anything locally.

import { PLATFORM_DNA as SIM_DNA } from "@/lib/simulation/platform";

/* ------------------------------------------------------------------- modes */

export interface OptimizationMode {
  key: string;
  label: string;
  directive: string;
}

export const OPTIMIZATION_MODES: OptimizationMode[] = [
  { key: "balanced", label: "Balanced", directive: "Balance every weighted objective without letting one dominate." },
  { key: "cost", label: "Cost minimisation", directive: "Minimise total cost subject to all hard constraints." },
  { key: "speed", label: "Speed", directive: "Minimise time to completion subject to all hard constraints." },
  { key: "risk", label: "Risk minimisation", directive: "Minimise aggregate operational, safety and compliance risk." },
  { key: "quality", label: "Quality / service", directive: "Maximise service level and quality outcomes." },
  { key: "utilisation", label: "Resource utilisation", directive: "Maximise effective utilisation of people, equipment and automation." },
  { key: "coverage", label: "Coverage", directive: "Maximise certification, skill and shift coverage." },
  { key: "robust", label: "Robust", directive: "Prefer strategies that stay feasible under adverse assumptions." },
  { key: "pareto", label: "Pareto exploration", directive: "Return the nondominated frontier across the stated objectives." },
];

export const modeByKey = (key?: string) =>
  OPTIMIZATION_MODES.find((m) => m.key === key) ?? OPTIMIZATION_MODES[0];

export const TIME_HORIZONS = ["24h", "7d", "30d", "90d", "6m", "1y", "3y"] as const;
export type TimeHorizon = (typeof TIME_HORIZONS)[number];

/* -------------------------------------------------------------- objectives */

export const MEASUREMENT_METHODS = [
  "platform_metric", "financial_ledger", "timecard_actuals", "compliance_events",
  "safety_incidents", "client_feedback", "utilisation_rate", "manual_review",
] as const;
export type MeasurementMethod = (typeof MEASUREMENT_METHODS)[number];

export interface Objective {
  id: string;
  key: string;
  label: string;
  direction: "maximise" | "minimise";
  weight: number;
  priority: number;
  target: string;
  threshold: string;
  horizon: TimeHorizon;
  measurement: MeasurementMethod;
  /** mandatory objectives may not be traded away by the engine */
  mandatory: boolean;
}

export const OBJECTIVE_CATALOG: Array<Pick<Objective, "key" | "label" | "direction"> & { unit: string }> = [
  { key: "cost", label: "Total cost", direction: "minimise", unit: "currency" },
  { key: "overtime", label: "Overtime hours", direction: "minimise", unit: "hours" },
  { key: "travel", label: "Travel distance", direction: "minimise", unit: "miles" },
  { key: "time_to_fill", label: "Time to fill", direction: "minimise", unit: "days" },
  { key: "margin", label: "Gross margin", direction: "maximise", unit: "percent" },
  { key: "revenue", label: "Revenue", direction: "maximise", unit: "currency" },
  { key: "safety", label: "Safety performance", direction: "maximise", unit: "index" },
  { key: "compliance", label: "Compliance coverage", direction: "maximise", unit: "percent" },
  { key: "certification_coverage", label: "Certification coverage", direction: "maximise", unit: "percent" },
  { key: "service_level", label: "Service level", direction: "maximise", unit: "percent" },
  { key: "utilisation", label: "Workforce utilisation", direction: "maximise", unit: "percent" },
  { key: "worker_preference", label: "Worker preference match", direction: "maximise", unit: "index" },
  { key: "retention", label: "Worker retention", direction: "maximise", unit: "percent" },
  { key: "training_coverage", label: "Training coverage", direction: "maximise", unit: "percent" },
  { key: "automation_leverage", label: "Automation leverage", direction: "maximise", unit: "index" },
  { key: "resource_footprint", label: "Resource footprint", direction: "minimise", unit: "index" },
];

export const newObjective = (key = "cost"): Objective => {
  const spec = OBJECTIVE_CATALOG.find((o) => o.key === key) ?? OBJECTIVE_CATALOG[0];
  return {
    id: crypto.randomUUID(),
    key: spec.key,
    label: spec.label,
    direction: spec.direction,
    weight: 0.5,
    priority: 2,
    target: "",
    threshold: "",
    horizon: "90d",
    measurement: "platform_metric",
    mandatory: false,
  };
};

/** Objective pairs that structurally pull against each other. */
const CONFLICT_PAIRS: Array<[string, string, string]> = [
  ["cost", "safety", "Lower cost usually reduces supervision, PPE and staffing headroom."],
  ["cost", "service_level", "Cost minimisation reduces buffer capacity that protects service level."],
  ["cost", "training_coverage", "Training hours are a direct cost."],
  ["overtime", "service_level", "Avoiding overtime removes the flexibility that protects coverage."],
  ["travel", "worker_preference", "Shortest travel routes often ignore stated worker preferences."],
  ["time_to_fill", "certification_coverage", "Filling faster narrows the certified candidate pool."],
  ["margin", "retention", "Margin pressure typically shows up in pay and retention."],
  ["automation_leverage", "retention", "Automation leverage displaces human hours."],
  ["utilisation", "safety", "High utilisation reduces recovery time and raises incident risk."],
];

export interface ObjectiveConflict { a: string; b: string; reason: string }

export function objectiveConflicts(objectives: Objective[]): ObjectiveConflict[] {
  const keys = new Set(objectives.map((o) => o.key));
  const out: ObjectiveConflict[] = [];
  CONFLICT_PAIRS.forEach(([a, b, reason]) => {
    if (keys.has(a) && keys.has(b)) out.push({ a, b, reason });
  });
  const mandatory = objectives.filter((o) => o.mandatory);
  if (mandatory.length > 3) {
    out.push({
      a: "mandatory", b: "feasibility",
      reason: `${mandatory.length} mandatory objectives may make the problem infeasible — consider marking some as preferred.`,
    });
  }
  return out;
}

/* ------------------------------------------------------------- constraints */

export type ConstraintEnforcement = "HARD" | "SOFT" | "ADVISORY";

export interface ConstraintSource {
  key: string;
  label: string;
  /** enforcement floor — constraints from this source can never be weaker */
  enforcement: ConstraintEnforcement;
  /** immovable sources: no weighting, relaxation or removal controls may be shown */
  immutable: boolean;
  description: string;
}

export const CONSTRAINT_SOURCES: ConstraintSource[] = [
  { key: "constitution", label: "Constitution", enforcement: "HARD", immutable: true, description: "IWOS Constitution v1.0 — inviolable platform law." },
  { key: "government", label: "Government", enforcement: "HARD", immutable: true, description: "Statutory obligations (wage, hours, employment law)." },
  { key: "regulation", label: "Regulation", enforcement: "HARD", immutable: true, description: "Regulatory requirements such as OSHA and licensing bodies." },
  { key: "contract", label: "Contract", enforcement: "HARD", immutable: false, description: "Client contract terms and service agreements." },
  { key: "policy", label: "Organization Policy", enforcement: "SOFT", immutable: false, description: "Agency policy and internal standards." },
  { key: "safety", label: "Safety", enforcement: "HARD", immutable: true, description: "Safety rules, PPE and site requirements." },
  { key: "budget", label: "Budget", enforcement: "SOFT", immutable: false, description: "Budget ceilings and financial guardrails." },
  { key: "schedule", label: "Schedule", enforcement: "SOFT", immutable: false, description: "Shift windows, deadlines and calendars." },
  { key: "skills", label: "Skills", enforcement: "HARD", immutable: false, description: "Required skills for the work being staffed." },
  { key: "certification", label: "Certification", enforcement: "HARD", immutable: true, description: "Credential and certification requirements." },
  { key: "resources", label: "Resources", enforcement: "SOFT", immutable: false, description: "Available people, equipment, vehicles and facilities." },
  { key: "technology", label: "Technology", enforcement: "SOFT", immutable: false, description: "System, integration and compute limits." },
  { key: "platform", label: "Platform Domain", enforcement: "HARD", immutable: true, description: "Platform Organism invariants and data boundaries." },
  { key: "custom", label: "Custom", enforcement: "ADVISORY", immutable: false, description: "User-defined guidance for this optimization." },
];

export const sourceByKey = (key?: string) =>
  CONSTRAINT_SOURCES.find((s) => s.key === key) ?? CONSTRAINT_SOURCES[CONSTRAINT_SOURCES.length - 1];

export interface Constraint {
  id: string;
  source: string;
  statement: string;
  enforcement: ConstraintEnforcement;
  /** SOFT / ADVISORY only — HARD constraints are never weighted */
  penalty: number;
  active: boolean;
  reference: string;
}

export const newConstraint = (source = "policy"): Constraint => {
  const spec = sourceByKey(source);
  return {
    id: crypto.randomUUID(),
    source: spec.key,
    statement: "",
    enforcement: spec.enforcement,
    penalty: spec.enforcement === "HARD" ? 1 : 0.5,
    active: true,
    reference: "",
  };
};

/** A constraint is locked when its source is immutable or its enforcement is HARD. */
export const isLocked = (c: Constraint) => sourceByKey(c.source).immutable || c.enforcement === "HARD";

/** Constraints the platform always applies, surfaced read-only in the UI. */
export const BASELINE_CONSTRAINTS: Constraint[] = [
  { id: "const-constitution", source: "constitution", statement: "Worker safety, consent and data sovereignty may never be traded for efficiency.", enforcement: "HARD", penalty: 1, active: true, reference: "IWOS Constitution v1.0 §1" },
  { id: "const-law", source: "government", statement: "Statutory wage, hour and rest requirements must hold in every strategy.", enforcement: "HARD", penalty: 1, active: true, reference: "Employment law" },
  { id: "const-cert", source: "certification", statement: "Every assignment requires valid, unexpired credentials for the work performed.", enforcement: "HARD", penalty: 1, active: true, reference: "Compliance module" },
  { id: "const-safety", source: "safety", statement: "Site safety requirements and PPE rules are non-negotiable.", enforcement: "HARD", penalty: 1, active: true, reference: "Safety policy" },
  { id: "const-platform", source: "platform", statement: "Optimization may not cross agency tenancy boundaries.", enforcement: "HARD", penalty: 1, active: true, reference: "PC-5.8D" },
];

/* ------------------------------------------------------------ resource kinds */

export const RESOURCE_KINDS = [
  "people", "teams", "ai_agents", "robots", "equipment", "vehicles",
  "facilities", "budget", "time", "training", "knowledge", "compute", "future",
] as const;
export type ResourceKind = (typeof RESOURCE_KINDS)[number];

export const RESOURCE_LABELS: Record<ResourceKind, string> = {
  people: "People", teams: "Teams", ai_agents: "AI Agents", robots: "Robots",
  equipment: "Equipment", vehicles: "Vehicles", facilities: "Facilities", budget: "Budget",
  time: "Time", training: "Training", knowledge: "Knowledge", compute: "Compute", future: "Future resources",
};

/* ------------------------------------------------------------------- risks */

export const RISK_DOMAINS = [
  "Operational", "Financial", "Compliance", "Safety", "Workforce",
  "Automation", "AI", "Infrastructure", "Vendor", "Embodied Intelligence",
] as const;
export type RiskDomain = (typeof RISK_DOMAINS)[number];

/* ------------------------------------------------------- comparison metrics */

export interface ComparisonMetric { key: string; label: string; better: "low" | "high" }

export const COMPARISON_METRICS: ComparisonMetric[] = [
  { key: "cost", label: "Cost", better: "low" },
  { key: "time", label: "Time", better: "low" },
  { key: "risk", label: "Risk", better: "low" },
  { key: "revenue", label: "Revenue", better: "high" },
  { key: "margin", label: "Margin", better: "high" },
  { key: "safety", label: "Safety", better: "high" },
  { key: "compliance", label: "Compliance", better: "high" },
  { key: "resource_use", label: "Resource use", better: "low" },
  { key: "worker_impact", label: "Worker impact", better: "high" },
  { key: "automation_impact", label: "Automation impact", better: "high" },
  { key: "customer_impact", label: "Customer impact", better: "high" },
  { key: "environmental", label: "Resource footprint", better: "low" },
];

/* -------------------------------------------------------------- definition */

export interface OptimizationDefinition {
  name: string;
  question: string;
  mode: string;
  horizon: TimeHorizon;
  objectives: Objective[];
  constraints: Constraint[];
  entities: string[];
  resources: string[];
  confidence_threshold: number;
  origin: "manual" | "natural_language" | "template" | "sensitivity" | "simulation";
}

export const emptyDefinition = (): OptimizationDefinition => ({
  name: "",
  question: "",
  mode: "balanced",
  horizon: "90d",
  objectives: [newObjective("cost")],
  constraints: [],
  entities: [],
  resources: [],
  confidence_threshold: 0.5,
  origin: "manual",
});

export interface OptimizationTemplate {
  key: string;
  domain: string;
  label: string;
  question: string;
  mode: string;
  objectiveKeys: string[];
  constraintSources: string[];
}

export const OPTIMIZATION_TEMPLATES: OptimizationTemplate[] = [
  { key: "lowest_cost_schedule", domain: "Scheduling", label: "Lowest-cost schedule without overtime", question: "Find the lowest-cost schedule that avoids overtime and keeps every required certification covered.", mode: "cost", objectiveKeys: ["cost", "overtime", "certification_coverage"], constraintSources: ["certification", "schedule", "budget"] },
  { key: "safe_project_staffing", domain: "Staffing", label: "Safest project staffing with least travel", question: "Find the best way to staff this project while maximizing safety and minimizing travel.", mode: "risk", objectiveKeys: ["safety", "travel", "cost"], constraintSources: ["safety", "skills", "certification"] },
  { key: "training_plan", domain: "Training", label: "Six-month training plan", question: "Optimize our training plan for the next six months.", mode: "coverage", objectiveKeys: ["training_coverage", "cost", "retention"], constraintSources: ["budget", "schedule", "policy"] },
  { key: "human_machine_mix", domain: "Automation", label: "Human and autonomous equipment mix", question: "Find the best allocation of humans and autonomous equipment for this project.", mode: "utilisation", objectiveKeys: ["automation_leverage", "cost", "safety", "retention"], constraintSources: ["safety", "technology", "resources"] },
  { key: "cost_reduction", domain: "Finance", label: "Reduce operating cost 10%", question: "Reduce operating cost 10% without violating service or safety targets.", mode: "cost", objectiveKeys: ["cost", "service_level", "safety"], constraintSources: ["contract", "safety", "budget"] },
  { key: "margin_recovery", domain: "Finance", label: "Recover margin on low-margin clients", question: "Find the strategy that recovers margin on low-margin clients without losing service level.", mode: "balanced", objectiveKeys: ["margin", "service_level", "retention"], constraintSources: ["contract", "policy"] },
  { key: "coverage_risk", domain: "Compliance", label: "Close certification coverage gaps", question: "Find the cheapest way to close every certification coverage gap in the next 90 days.", mode: "coverage", objectiveKeys: ["certification_coverage", "cost", "compliance"], constraintSources: ["certification", "regulation", "budget"] },
  { key: "retention_plan", domain: "Workforce", label: "Improve retention within budget", question: "Improve worker retention as much as possible within the current labour budget.", mode: "balanced", objectiveKeys: ["retention", "cost", "worker_preference"], constraintSources: ["budget", "policy"] },
];

export const TEMPLATE_DOMAINS = Array.from(new Set(OPTIMIZATION_TEMPLATES.map((t) => t.domain)));

export function definitionFromTemplate(t: OptimizationTemplate): OptimizationDefinition {
  return {
    ...emptyDefinition(),
    name: t.label,
    question: t.question,
    mode: t.mode,
    objectives: t.objectiveKeys.map((k, i) => ({ ...newObjective(k), priority: i + 1, weight: i === 0 ? 0.8 : 0.5 })),
    constraints: t.constraintSources.map((s) => ({ ...newConstraint(s), statement: sourceByKey(s).description })),
    origin: "template",
  };
}

/* ---------------------------------------------------------- engine payload */

/** Compose the optimization request sent to the Platform Optimization Engine. */
export function toEnginePayload(def: OptimizationDefinition) {
  const mode = modeByKey(def.mode);
  const active = [...BASELINE_CONSTRAINTS, ...def.constraints.filter((c) => c.active && c.statement.trim())];
  const scenario = [
    "Platform optimization request.",
    def.question.trim(),
    `Optimization mode: ${mode.label}. ${mode.directive}`,
    `Time horizon: ${def.horizon}.`,
    `Objectives: ${def.objectives.map((o) => `${o.label} (${o.direction}, weight ${o.weight}, priority ${o.priority}${o.mandatory ? ", mandatory" : ""}${o.target ? `, target ${o.target}` : ""})`).join("; ")}.`,
    `Hard constraints that must never be violated or relaxed: ${active.filter((c) => c.enforcement === "HARD").map((c) => c.statement).join("; ")}.`,
    active.some((c) => c.enforcement !== "HARD")
      ? `Soft and advisory constraints: ${active.filter((c) => c.enforcement !== "HARD").map((c) => `${c.statement} (penalty ${c.penalty})`).join("; ")}.`
      : "",
    def.entities.length ? `Entities in scope: ${def.entities.join("; ")}.` : "",
    def.resources.length ? `Resources in scope: ${def.resources.join("; ")}.` : "",
    "Return JSON only with this shape: {\"strategies\":[{\"id\":\"\",\"name\":\"\",\"summary\":\"\",\"status\":\"recommended|alternative|rejected\",\"rejection_reason\":\"\",\"confidence\":0,\"uncertainty\":\"\",\"explanation\":\"\",\"metrics\":{\"cost\":0,\"time\":0,\"risk\":0,\"revenue\":0,\"margin\":0,\"safety\":0,\"compliance\":0,\"resource_use\":0,\"worker_impact\":0,\"automation_impact\":0,\"customer_impact\":0,\"environmental\":0},\"objectives\":[{\"key\":\"\",\"achievement\":0}],\"constraints\":[{\"label\":\"\",\"source\":\"\",\"enforcement\":\"HARD|SOFT|ADVISORY\",\"satisfied\":true,\"binding\":false}],\"dependencies\":[\"\"],\"costs\":[\"\"],\"benefits\":[\"\"],\"risks\":[{\"domain\":\"\",\"label\":\"\",\"probability\":0,\"impact\":0,\"confidence\":0,\"organisms\":[\"\"]}],\"resources\":[{\"kind\":\"\",\"name\":\"\",\"allocated\":0,\"capacity\":0,\"unit\":\"\",\"timeframe\":\"\"}],\"pareto\":true,\"approval\":{\"roles\":[\"\"],\"reason\":\"\",\"policy\":\"\",\"constitution\":\"\"}}],\"sensitivity\":[{\"variable\":\"\",\"influence\":0,\"binding_constraint\":\"\",\"switch_threshold\":\"\",\"note\":\"\"}],\"conflicts\":[{\"a\":\"\",\"b\":\"\",\"detail\":\"\"}],\"explanation\":\"\",\"confidence\":0}",
  ].filter(Boolean).join(" ");

  return {
    scenario: scenario.slice(0, 6000),
    inputs: {
      artifact: "optimization",
      contract: PLATFORM_DNA.platform_contract,
      definition_name: def.name || null,
      mode: def.mode,
      horizon: def.horizon,
      confidence_threshold: def.confidence_threshold,
      objectives: def.objectives,
      constraints: active,
      entities: def.entities,
      resources: def.resources,
      origin: def.origin,
    } as Record<string, unknown>,
  };
}

/* ------------------------------------------------------------ record shapes */

export interface StrategyObjective { key: string; achievement: number }
export interface StrategyConstraint {
  label: string; source: string; enforcement: ConstraintEnforcement; satisfied: boolean; binding: boolean;
}
export interface StrategyRisk {
  domain: string; label: string; probability: number; impact: number; confidence: number; organisms: string[];
}
export interface StrategyResource {
  kind: string; name: string; allocated: number; capacity: number; unit: string; timeframe: string;
}
export interface StrategyApproval { roles: string[]; reason: string; policy: string; constitution: string }

export interface Strategy {
  id: string;
  name: string;
  summary: string;
  status: "recommended" | "alternative" | "rejected";
  rejection_reason: string;
  confidence: number;
  uncertainty: string;
  explanation: string;
  metrics: Record<string, number>;
  objectives: StrategyObjective[];
  constraints: StrategyConstraint[];
  dependencies: string[];
  costs: string[];
  benefits: string[];
  risks: StrategyRisk[];
  resources: StrategyResource[];
  pareto: boolean;
  approval: StrategyApproval;
}

export interface SensitivityReading {
  variable: string; influence: number; binding_constraint: string; switch_threshold: string; note: string;
}

export interface OptimizationRecord {
  id: string;
  agency_id: string;
  created_at: string;
  question: string;
  confidence: number | null;
  inputs: Record<string, unknown>;
  strategies: Strategy[];
  sensitivity: SensitivityReading[];
  conflicts: Array<{ a: string; b: string; detail: string }>;
  explanation: string;
}

const rec = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const str = (v: unknown, d = "") => (v == null ? d : String(v));

function parseStrategy(raw: unknown, index: number): Strategy {
  const s = rec(raw);
  const status = str(s.status, "alternative");
  return {
    id: str(s.id) || `s${index + 1}`,
    name: str(s.name) || `Strategy ${index + 1}`,
    summary: str(s.summary),
    status: status === "recommended" || status === "rejected" ? status : "alternative",
    rejection_reason: str(s.rejection_reason),
    confidence: num(s.confidence),
    uncertainty: str(s.uncertainty),
    explanation: str(s.explanation),
    metrics: Object.fromEntries(Object.entries(rec(s.metrics)).map(([k, v]) => [k, num(v)])),
    objectives: arr(s.objectives).map((o) => ({ key: str(rec(o).key), achievement: num(rec(o).achievement) })),
    constraints: arr(s.constraints).map((c) => {
      const x = rec(c);
      const e = str(x.enforcement, "SOFT").toUpperCase();
      return {
        label: str(x.label),
        source: str(x.source, "custom"),
        enforcement: (e === "HARD" || e === "ADVISORY" ? e : "SOFT") as ConstraintEnforcement,
        satisfied: x.satisfied !== false,
        binding: x.binding === true,
      };
    }),
    dependencies: arr(s.dependencies).map((d) => str(d)),
    costs: arr(s.costs).map((c) => str(c)),
    benefits: arr(s.benefits).map((b) => str(b)),
    risks: arr(s.risks).map((r) => {
      const x = rec(r);
      return {
        domain: str(x.domain, "Operational"),
        label: str(x.label),
        probability: num(x.probability),
        impact: num(x.impact),
        confidence: num(x.confidence),
        organisms: arr(x.organisms).map((o) => str(o)),
      };
    }),
    resources: arr(s.resources).map((r) => {
      const x = rec(r);
      return {
        kind: str(x.kind, "people"),
        name: str(x.name),
        allocated: num(x.allocated),
        capacity: num(x.capacity),
        unit: str(x.unit),
        timeframe: str(x.timeframe),
      };
    }),
    pareto: s.pareto === true,
    approval: {
      roles: arr(rec(s.approval).roles).map((r) => str(r)),
      reason: str(rec(s.approval).reason),
      policy: str(rec(s.approval).policy),
      constitution: str(rec(s.approval).constitution),
    },
  };
}

/** Project an engine row (cognitive store) into the workspace record shape. */
export function parseOptimization(row: Record<string, unknown>): OptimizationRecord {
  const results = rec(row.results);
  const strategies = arr(results.strategies).length ? arr(results.strategies) : arr(row.strategies);
  return {
    id: str(row.id),
    agency_id: str(row.agency_id),
    created_at: str(row.created_at, new Date().toISOString()),
    question: str(row.scenario ?? row.question),
    confidence: row.confidence == null ? null : num(row.confidence),
    inputs: rec(row.inputs),
    strategies: strategies.map(parseStrategy),
    sensitivity: arr(results.sensitivity).map((s) => {
      const x = rec(s);
      return {
        variable: str(x.variable),
        influence: num(x.influence),
        binding_constraint: str(x.binding_constraint),
        switch_threshold: str(x.switch_threshold),
        note: str(x.note),
      };
    }),
    conflicts: arr(results.conflicts).map((c) => {
      const x = rec(c);
      return { a: str(x.a), b: str(x.b), detail: str(x.detail) };
    }),
    explanation: str(results.explanation),
  };
}

/** Only rows produced by this workspace are optimization artifacts. */
export const isOptimizationRow = (row: Record<string, unknown>) =>
  rec(row.inputs).artifact === "optimization";

export const optName = (o: OptimizationRecord) =>
  str(o.inputs.definition_name) || o.question.replace(/^Platform optimization request\.\s*/, "").split(".")[0].slice(0, 80) || "Untitled optimization";
export const optMode = (o: OptimizationRecord) => str(o.inputs.mode, "balanced");
export const optHorizon = (o: OptimizationRecord) => str(o.inputs.horizon, "—");
export const optThreshold = (o: OptimizationRecord) => num(o.inputs.confidence_threshold, 0.5);
export const optObjectives = (o: OptimizationRecord): Objective[] =>
  arr(o.inputs.objectives).map((x) => rec(x) as unknown as Objective);
export const optConstraints = (o: OptimizationRecord): Constraint[] =>
  arr(o.inputs.constraints).map((x) => rec(x) as unknown as Constraint);
export const recommendedStrategy = (o: OptimizationRecord) =>
  o.strategies.find((s) => s.status === "recommended") ?? o.strategies[0] ?? null;

/** Objective achievement 0..1 averaged across a strategy — engine values only. */
export const objectiveAchievement = (s: Strategy) =>
  s.objectives.length ? s.objectives.reduce((a, o) => a + o.achievement, 0) / s.objectives.length : 0;

export const violatesHardConstraint = (s: Strategy) =>
  s.constraints.some((c) => c.enforcement === "HARD" && !c.satisfied);

/* ------------------------------------------------------- local workspace state */

export const OPT_SETTINGS_KEY = "iwos.optimization.settings.v1";
export const OPT_SAVED_DEFS_KEY = "iwos.optimization.definitions.v1";
export const OPT_SAVED_RESULTS_KEY = "iwos.optimization.saved.v1";
export const OPT_CALIBRATION_KEY = "iwos.optimization.calibration.v1";
export const OPT_DECISION_QUEUE_KEY = "iwos.optimization.decisions.v1";

export interface OptSettings {
  defaultMode: string;
  defaultHorizon: TimeHorizon;
  confidenceThreshold: number;
  view: "executive" | "analyst";
  showRawOutput: boolean;
  showSolverMetadata: boolean;
  rowLimit: number;
}

export const DEFAULT_OPT_SETTINGS: OptSettings = {
  defaultMode: "balanced",
  defaultHorizon: "90d",
  confidenceThreshold: 0.5,
  view: "analyst",
  showRawOutput: false,
  showSolverMetadata: false,
  rowLimit: 200,
};

export interface SavedDefinition extends OptimizationDefinition { id: string; createdAt: string }

export interface OptCalibrationRecord {
  id: string;
  optimizationId: string;
  optimizationName: string;
  mode: string;
  recordedAt: string;
  recommendedStrategy: string;
  chosenStrategy: string;
  expectedConfidence: number;
  objectiveAchievement: number;
  predictionError: number;
  constraintIncidents: number;
  secondOrderEffects: string;
  actualOutcome: string;
}

export const optimizationError = (c: OptCalibrationRecord) =>
  Math.abs(c.expectedConfidence - c.objectiveAchievement);

export interface DecisionHandoff {
  id: string;
  optimizationId: string;
  optimizationName: string;
  strategyId: string;
  strategyName: string;
  submittedAt: string;
  approvalRoles: string[];
  reason: string;
  policy: string;
  constitution: string;
  status: "awaiting_review" | "sent" | "failed";
  detail: string;
}

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return Array.isArray(fallback) ? parsed : { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

/* ------------------------------------------------------------- Platform DNA */

export const PLATFORM_DNA = {
  organism: "Platform Optimization Workspace",
  phase: "5.8D",
  architecture_version: "IWOS v1.4.1",
  constitution_version: "v1.0",
  platform_contract: "PC-5.8D",
  capability_specification: "CapSpec-5.8D",
  platform_dna: "PDNA-5.8D",
  purpose:
    "Human-facing environment for defining objectives and constraints, exploring optimized strategies, inspecting tradeoffs, sensitivity and Pareto alternatives, and handing a selected strategy to Decision Intelligence.",
  dependencies: [
    "WOIC Cognitive Core (Platform Optimization Engine)",
    `Platform Simulation Workspace (${SIM_DNA.platform_contract})`,
    "Decision Console (WOIC decisions)",
    "Platform Graph Intelligence (woic-graph)",
    "Universal Timeline Workspace",
    "Universal Command Center",
  ],
  apis_consumed: [
    "woic-cognitive:simulate (optimization solve)",
    "woic-cognitive:reason (natural-language translation, tradeoff explanation)",
    "woic-cognitive:explain",
    "woic-cognitive:recommend (decision handoff)",
    "woic-cognitive:snapshot",
    "woic-graph:find_organizational_risks",
    "woic_simulations (cognitive read model, RLS-scoped)",
    "woic_recommendations (decision handoff read model, RLS-scoped)",
  ],
  permissions: [
    "optimization_viewer", "optimization_creator", "optimization_analyst",
    "optimization_approver", "optimization_administrator", "executive_viewer",
    "solver_metadata_access", "cross_domain_optimization_access",
  ],
  writes: ["woic_simulations (engine only)", "woic_recommendations (decision handoff, engine only)"],
  guarantees: [
    "No optimizer, solver or ranking heuristic executes in the browser.",
    "No additional optimization datastore exists — the cognitive store is the single source.",
    "Hard constitutional, legal, safety and certification constraints expose no weighting or relaxation controls.",
    "Selecting a strategy never executes it — it is routed to Decision Intelligence for approval.",
    "Unavailable engine capability is shown as a truthful degraded state, never as synthetic output.",
  ],
  health_signals: [
    "Optimization engine reachability",
    "Structured strategy parse rate",
    "Constraint satisfaction reporting",
    "Decision handoff delivery",
  ],
  version_history: [
    { version: "5.8D.0", note: "Initial production build of the Platform Optimization Workspace." },
  ],
} as const;

/* --------------------------------------------------------------- permissions */

export type OptimizationCapability =
  | "view" | "create" | "analyze" | "approve" | "administer" | "executive" | "solver" | "cross_domain";

const ROLE_CAPABILITIES: Record<string, OptimizationCapability[]> = {
  super_admin: ["view", "create", "analyze", "approve", "administer", "executive", "solver", "cross_domain"],
  agency_admin: ["view", "create", "analyze", "approve", "executive", "cross_domain"],
  agency_staff: ["view", "create", "analyze"],
  client_user: ["view", "executive"],
  worker: ["view"],
};

export function optimizationCapabilities(roles: string[]): Set<OptimizationCapability> {
  const set = new Set<OptimizationCapability>();
  roles.forEach((r) => (ROLE_CAPABILITIES[r] ?? []).forEach((c) => set.add(c)));
  return set;
}
