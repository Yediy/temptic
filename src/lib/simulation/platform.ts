// IWOS Platform Simulation Workspace — Platform DNA (PDNA-5.8B).
// Declarative configuration only. Every scenario execution, prediction, graph
// traversal and optimization happens in the Platform Simulation Engine
// (`woic-cognitive` simulate/reason/predict/explain + `woic-graph`).
// Nothing in this file simulates anything.

import { readJson, writeJson } from "@/lib/graph/platform";

export { readJson, writeJson };

/* ------------------------------------------------------------------ modes */

export interface SimulationMode {
  key: string;
  label: string;
  hint: string;
  /** Instruction fragment appended to the scenario sent to the engine. */
  directive: string;
}

/** Only modes the backend simulate contract can honour are exposed. */
export const SIMULATION_MODES: SimulationMode[] = [
  { key: "single", label: "Single Scenario", hint: "One scenario, one projection", directive: "Model this single scenario." },
  { key: "comparison", label: "Scenario Comparison", hint: "Contrast against current state", directive: "Model this scenario and contrast every outcome against the unchanged current state." },
  { key: "sensitivity", label: "Sensitivity Analysis", hint: "Which variables move the result", directive: "Vary each input variable independently and report which variables move outcomes most." },
  { key: "stress", label: "Stress Test", hint: "Push constraints to breaking point", directive: "Stress the scenario to the point where constraints break and report the breaking thresholds." },
  { key: "best", label: "Best Case", hint: "Optimistic branch", directive: "Model the optimistic branch with favourable assumptions, stating them explicitly." },
  { key: "expected", label: "Expected Case", hint: "Most likely branch", directive: "Model the most likely branch using current operating conditions." },
  { key: "worst", label: "Worst Case", hint: "Adverse branch", directive: "Model the adverse branch with unfavourable assumptions, stating them explicitly." },
  { key: "counterfactual", label: "Counterfactual", hint: "What if history differed", directive: "Model this as a counterfactual: assume the change already happened in the past and project the altered present." },
  { key: "replay", label: "Historical Replay", hint: "Re-run recorded history", directive: "Replay recorded organisational history under the stated change and report the divergence." },
  { key: "forward", label: "Forward Projection", hint: "Project forward from today", directive: "Project forward from today's state across the requested horizon." },
  { key: "cascade", label: "Cascade Analysis", hint: "Second and third order effects", directive: "Trace first, second and third order cascading effects across Platform Organisms." },
  { key: "probabilistic", label: "Probabilistic Simulation", hint: "Distribution of outcomes", directive: "Produce a probability-weighted distribution of outcomes with explicit confidence bounds." },
];

export const modeByKey = (key?: string) =>
  SIMULATION_MODES.find((m) => m.key === key) ?? SIMULATION_MODES[0];

/* ------------------------------------------------------------- input kinds */

export const SCENARIO_ENTITY_KINDS = [
  "People", "Organizations", "Projects", "Platform Domains", "Locations", "Clients",
  "Vendors", "Knowledge", "Policies", "Automations", "AI Agents", "Equipment",
  "Robots", "Finances", "Schedules", "Regulations", "Custom",
] as const;

export const TIME_HORIZONS = ["24h", "7d", "30d", "90d", "6m", "1y", "3y"] as const;
export type TimeHorizon = (typeof TIME_HORIZONS)[number];

export const TIMELINE_GRAINS = ["hour", "day", "week", "month", "quarter", "year"] as const;
export type TimelineGrain = (typeof TIMELINE_GRAINS)[number];

export const PROJECTION_KINDS = ["ACTUAL", "PROJECTED", "COUNTERFACTUAL", "SIMULATED"] as const;
export type ProjectionKind = (typeof PROJECTION_KINDS)[number];

export const RISK_CATEGORIES = [
  "Operational", "Financial", "Compliance", "Workforce", "Project", "Knowledge",
  "Automation", "AI", "Infrastructure", "Vendor", "Embodied Intelligence",
] as const;

/* -------------------------------------------------------- scenario definition */

export interface ScenarioVariable { key: string; value: string }
export interface ScenarioAssumption { statement: string; source: string; confidence: number; editable: boolean; impact: "low" | "medium" | "high" }

export interface ScenarioDefinition {
  name: string;
  question: string;
  mode: string;
  horizon: TimeHorizon;
  confidence_threshold: number;
  entity_kinds: string[];
  entities: string[];
  policies: string[];
  constraints: string[];
  variables: ScenarioVariable[];
  assumptions: ScenarioAssumption[];
  origin?: "manual" | "natural_language" | "template" | "decision_console" | "automation_studio";
}

export const emptyScenario = (): ScenarioDefinition => ({
  name: "",
  question: "",
  mode: "expected",
  horizon: "90d",
  confidence_threshold: 0.5,
  entity_kinds: [],
  entities: [],
  policies: [],
  constraints: [],
  variables: [],
  assumptions: [],
  origin: "manual",
});

/* ------------------------------------------------------------- template library */

export interface ScenarioTemplate {
  key: string;
  domain: string;
  label: string;
  question: string;
  mode: string;
  horizon: TimeHorizon;
  entity_kinds: string[];
  variables: ScenarioVariable[];
  constraints: string[];
}

export const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  { key: "org_restructure", domain: "Organization", label: "Organizational restructuring", question: "What happens if we restructure this organization into three delivery pods?", mode: "cascade", horizon: "6m", entity_kinds: ["Organizations", "People", "Projects"], variables: [{ key: "pods", value: "3" }], constraints: ["No involuntary terminations"] },
  { key: "manager_leaves", domain: "Organization", label: "Key manager departs", question: "What happens if this manager leaves?", mode: "cascade", horizon: "90d", entity_kinds: ["People", "Projects", "Clients"], variables: [{ key: "notice_days", value: "14" }], constraints: [] },
  { key: "workforce_loss", domain: "Workforce", label: "Project loses 20% of workforce", question: "What happens if this project loses 20% of its workforce?", mode: "stress", horizon: "30d", entity_kinds: ["People", "Projects", "Schedules"], variables: [{ key: "attrition_pct", value: "20" }], constraints: ["Deadline fixed"] },
  { key: "demand_spike", domain: "Workforce", label: "Demand increases 40%", question: "What happens if demand increases 40% next quarter?", mode: "forward", horizon: "90d", entity_kinds: ["Clients", "People", "Finances"], variables: [{ key: "demand_delta_pct", value: "40" }], constraints: ["Hiring capacity 12/month"] },
  { key: "wage_change", domain: "Finance", label: "Pay rate increase", question: "What happens to margin if we raise pay rates by 8%?", mode: "sensitivity", horizon: "1y", entity_kinds: ["Finances", "People", "Clients"], variables: [{ key: "pay_delta_pct", value: "8" }], constraints: ["Bill rates fixed for 6 months"] },
  { key: "payroll_rule", domain: "Finance", label: "Payroll rule change", question: "What happens if we change the overtime threshold rule?", mode: "comparison", horizon: "90d", entity_kinds: ["Finances", "Policies", "Schedules"], variables: [{ key: "ot_threshold_hours", value: "40" }], constraints: [] },
  { key: "regulation_change", domain: "Compliance", label: "Regulation tightens", question: "What happens if this regulation changes and certification renewals shorten?", mode: "cascade", horizon: "6m", entity_kinds: ["Regulations", "Policies", "People"], variables: [{ key: "renewal_months", value: "12" }], constraints: ["No non-compliant deployment"] },
  { key: "audit_readiness", domain: "Compliance", label: "Unannounced audit", question: "What happens if a compliance audit lands next week?", mode: "stress", horizon: "7d", entity_kinds: ["Policies", "Knowledge", "People"], variables: [], constraints: [] },
  { key: "site_shutdown", domain: "Construction", label: "Site shutdown", question: "What happens if this construction site shuts down for two weeks?", mode: "cascade", horizon: "30d", entity_kinds: ["Locations", "Projects", "People"], variables: [{ key: "shutdown_days", value: "14" }], constraints: [] },
  { key: "shift_coverage", domain: "Healthcare", label: "Night shift coverage gap", question: "What happens if night-shift coverage drops below the required ratio?", mode: "worst", horizon: "30d", entity_kinds: ["Schedules", "People", "Compliance" as string], variables: [{ key: "ratio", value: "1:6" }], constraints: ["Statutory ratio must hold"] },
  { key: "training_rollout", domain: "Education", label: "Mandatory training rollout", question: "What happens if we mandate a new 8-hour training for all workers?", mode: "forward", horizon: "90d", entity_kinds: ["Knowledge", "People", "Finances"], variables: [{ key: "hours", value: "8" }], constraints: [] },
  { key: "public_contract", domain: "Government", label: "Public contract award", question: "What happens if we win a 200-worker public contract?", mode: "best", horizon: "6m", entity_kinds: ["Clients", "People", "Finances"], variables: [{ key: "headcount", value: "200" }], constraints: ["Prevailing wage applies"] },
  { key: "line_downtime", domain: "Manufacturing", label: "Production line downtime", question: "What happens if the main production line is down for 48 hours?", mode: "stress", horizon: "7d", entity_kinds: ["Equipment", "Projects", "Clients"], variables: [{ key: "downtime_hours", value: "48" }], constraints: [] },
  { key: "route_disruption", domain: "Logistics", label: "Route disruption", question: "What happens if regional transport is disrupted for a week?", mode: "cascade", horizon: "7d", entity_kinds: ["Locations", "Schedules", "Clients"], variables: [{ key: "disruption_days", value: "7" }], constraints: [] },
  { key: "robot_deployment", domain: "Robotics", label: "Deploy 25 autonomous machines", question: "What happens if we deploy 25 autonomous machines across operations?", mode: "probabilistic", horizon: "1y", entity_kinds: ["Robots", "People", "Finances"], variables: [{ key: "units", value: "25" }], constraints: ["No net workforce reduction in year one"] },
  { key: "robot_failure", domain: "Robotics", label: "Robot fleet failure", question: "What happens if the robot fleet fails during peak production?", mode: "worst", horizon: "30d", entity_kinds: ["Robots", "Equipment", "Clients"], variables: [], constraints: [] },
  { key: "agent_deployment", domain: "AI Operations", label: "Deploy AI agent to a workflow", question: "What happens if we deploy an autonomous AI agent to handle scheduling?", mode: "comparison", horizon: "90d", entity_kinds: ["AI Agents", "Automations", "People"], variables: [{ key: "autonomy", value: "supervised" }], constraints: ["Human approval on exceptions"] },
  { key: "workflow_automation", domain: "AI Operations", label: "Automate a manual workflow", question: "What happens if we automate this workflow end to end?", mode: "comparison", horizon: "90d", entity_kinds: ["Automations", "People", "Finances"], variables: [], constraints: [] },
  { key: "vendor_loss", domain: "Infrastructure", label: "Critical vendor fails", question: "What happens if this critical vendor fails to deliver?", mode: "cascade", horizon: "30d", entity_kinds: ["Vendors", "Projects", "Clients"], variables: [], constraints: [] },
  { key: "system_outage", domain: "Infrastructure", label: "Platform outage", question: "What happens if the platform is unavailable for a full working day?", mode: "worst", horizon: "24h", entity_kinds: ["Platform Domains", "People", "Clients"], variables: [{ key: "outage_hours", value: "8" }], constraints: [] },
  { key: "custom", domain: "Custom", label: "Blank scenario", question: "", mode: "expected", horizon: "90d", entity_kinds: [], variables: [], constraints: [] },
];

export const TEMPLATE_DOMAINS = Array.from(new Set(SCENARIO_TEMPLATES.map((t) => t.domain)));

export function scenarioFromTemplate(t: ScenarioTemplate): ScenarioDefinition {
  return {
    ...emptyScenario(),
    name: t.label,
    question: t.question,
    mode: t.mode,
    horizon: t.horizon,
    entity_kinds: [...t.entity_kinds],
    variables: t.variables.map((v) => ({ ...v })),
    constraints: [...t.constraints],
    origin: "template",
  };
}

/* --------------------------------------------------------- engine payload */

/** Compose the scenario text + inputs sent to the Simulation Engine. */
export function toEnginePayload(def: ScenarioDefinition) {
  const mode = modeByKey(def.mode);
  const scenario = [
    def.question.trim(),
    `Simulation mode: ${mode.label}. ${mode.directive}`,
    `Time horizon: ${def.horizon}.`,
    def.constraints.length ? `Constraints: ${def.constraints.join("; ")}.` : "",
    def.policies.length ? `Policies in scope: ${def.policies.join("; ")}.` : "",
    def.entities.length ? `Entities in scope: ${def.entities.join("; ")}.` : "",
    def.assumptions.length ? `Assumptions to hold: ${def.assumptions.map((a) => a.statement).join("; ")}.` : "",
  ].filter(Boolean).join(" ");

  return {
    scenario: scenario.slice(0, 4000),
    inputs: {
      definition_name: def.name || null,
      mode: def.mode,
      horizon: def.horizon,
      confidence_threshold: def.confidence_threshold,
      entity_kinds: def.entity_kinds,
      entities: def.entities,
      policies: def.policies,
      constraints: def.constraints,
      variables: Object.fromEntries(def.variables.filter((v) => v.key).map((v) => [v.key, v.value])),
      assumptions: def.assumptions,
      origin: def.origin ?? "manual",
      contract: PLATFORM_DNA.platform_contract,
    } as Record<string, unknown>,
  };
}

/* --------------------------------------------------- simulation record view */

export interface SimOutcome {
  horizon: string;
  description: string;
  probability: number;
  metrics: Record<string, unknown>;
}
export interface SimRecommendation { action: string; rationale: string; impact: string }

export interface SimulationRecord {
  id: string;
  agency_id: string;
  scenario: string;
  created_at: string;
  confidence: number | null;
  inputs: Record<string, unknown>;
  outcomes: SimOutcome[];
  assumptions: string[];
  recommendations: SimRecommendation[];
}

const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

export function parseSimulation(row: Record<string, unknown>): SimulationRecord {
  const results = asRecord(row.results);
  const outcomes = Array.isArray(results.outcomes) ? results.outcomes : [];
  const assumptions = Array.isArray(results.assumptions) ? results.assumptions : [];
  const recs = Array.isArray(row.recommendations) ? row.recommendations : [];
  return {
    id: String(row.id ?? ""),
    agency_id: String(row.agency_id ?? ""),
    scenario: String(row.scenario ?? ""),
    created_at: String(row.created_at ?? new Date().toISOString()),
    confidence: row.confidence == null ? null : Number(row.confidence),
    inputs: asRecord(row.inputs),
    outcomes: outcomes.map((o) => {
      const r = asRecord(o);
      return {
        horizon: String(r.horizon ?? "—"),
        description: String(r.description ?? ""),
        probability: Number(r.probability ?? 0),
        metrics: asRecord(r.metrics),
      };
    }),
    assumptions: assumptions.map((a) => String(a)),
    recommendations: recs.map((r) => {
      const x = asRecord(r);
      return { action: String(x.action ?? ""), rationale: String(x.rationale ?? ""), impact: String(x.impact ?? "") };
    }),
  };
}

export const simMode = (s: SimulationRecord) => String(s.inputs.mode ?? "single");
export const simName = (s: SimulationRecord) =>
  String(s.inputs.definition_name ?? "") || s.scenario.split(".")[0].slice(0, 80) || "Untitled scenario";
export const simHorizon = (s: SimulationRecord) => String(s.inputs.horizon ?? "—");
export const simThreshold = (s: SimulationRecord) => Number(s.inputs.confidence_threshold ?? 0.5);
export const isLowConfidence = (s: SimulationRecord) => (s.confidence ?? 0) < simThreshold(s);

/** Projected events derived from engine outcomes — never from local reasoning. */
export interface ProjectedEvent {
  id: string;
  label: string;
  horizon: string;
  probability: number;
  kind: ProjectionKind;
  metrics: Record<string, unknown>;
}

export function projectedEvents(s: SimulationRecord): ProjectedEvent[] {
  const mode = simMode(s);
  const kind: ProjectionKind =
    mode === "counterfactual" ? "COUNTERFACTUAL" : mode === "replay" ? "SIMULATED" : "PROJECTED";
  return s.outcomes.map((o, i) => ({
    id: `${s.id}:${i}`,
    label: o.description || `Outcome ${i + 1}`,
    horizon: o.horizon,
    probability: o.probability,
    kind,
    metrics: o.metrics,
  }));
}

/* --------------------------------------------------------- local workspace state */

export const SIM_SETTINGS_KEY = "iwos.simulation.settings.v1";
export const SIM_SAVED_SCENARIOS_KEY = "iwos.simulation.scenarios.v1";
export const SIM_SAVED_RESULTS_KEY = "iwos.simulation.saved.v1";
export const SIM_ARCHIVE_KEY = "iwos.simulation.archive.v1";
export const SIM_CALIBRATION_KEY = "iwos.simulation.calibration.v1";

export interface SimSettings {
  defaultMode: string;
  defaultHorizon: TimeHorizon;
  confidenceThreshold: number;
  view: "executive" | "analyst";
  graphNodeLimit: number;
  showRawOutput: boolean;
}

export const DEFAULT_SIM_SETTINGS: SimSettings = {
  defaultMode: "expected",
  defaultHorizon: "90d",
  confidenceThreshold: 0.5,
  view: "analyst",
  graphNodeLimit: 400,
  showRawOutput: false,
};

export interface SavedScenario extends ScenarioDefinition { id: string; createdAt: string }

export interface CalibrationRecord {
  id: string;
  simulationId: string;
  simulationName: string;
  mode: string;
  recordedAt: string;
  /** 0..1 — how accurate the projection turned out */
  predictionAccuracy: number;
  riskAccuracy: number;
  assumptionAccuracy: number;
  missedDependencies: number;
  secondOrderHits: number;
  expectedConfidence: number;
  actualOutcome: string;
}

export const simulationError = (c: CalibrationRecord) =>
  Math.abs(c.expectedConfidence - c.predictionAccuracy);

/* ------------------------------------------------------------- Platform DNA */

export const PLATFORM_DNA = {
  organism: "Platform Simulation Workspace",
  phase: "5.8B",
  architecture_version: "IWOS v1.4.0",
  constitution_version: "v1.0",
  platform_contract: "PC-5.8B",
  capability_specification: "CapSpec-5.8B",
  platform_dna: "PDNA-5.8B",
  purpose:
    "Human-facing environment for creating, running, comparing, explaining and reviewing simulated future states of IWOS without altering production reality.",
  dependencies: [
    "WOIC Cognitive Core (Platform Simulation Engine)",
    "Platform Graph Intelligence (woic-graph)",
    "Universal Timeline Workspace",
    "Decision Console (WOIC decisions)",
    "Automation Studio",
    "Universal Command Center",
  ],
  apis_consumed: [
    "woic-cognitive:simulate",
    "woic-cognitive:reason",
    "woic-cognitive:predict",
    "woic-cognitive:explain",
    "woic-cognitive:snapshot",
    "woic-graph:risk_propagation",
    "woic-graph:team_dependencies",
    "woic-graph:subgraph",
    "woic_simulations (read model, RLS-scoped)",
  ],
  permissions: [
    "simulation_viewer", "simulation_creator", "simulation_analyst",
    "simulation_approver", "simulation_administrator", "executive_viewer",
    "sensitive_scenario_access", "cross_domain_simulation_access",
  ],
  writes: ["woic_simulations (via engine only)"],
  guarantees: [
    "No simulation logic executes in the browser.",
    "No second simulation datastore exists — woic_simulations is the single store.",
    "Simulated state is always visually labelled and never merged with actual history.",
    "The workspace never executes a real decision or automation.",
  ],
  version_history: [
    { version: "5.8B.0", note: "Initial production build of the Platform Simulation Workspace." },
  ],
} as const;

/* --------------------------------------------------------------- permissions */

export type SimulationCapability =
  | "view" | "create" | "analyze" | "approve" | "administer" | "executive" | "sensitive" | "cross_domain";

/** Role → capability map layered on the existing RBAC roles. */
const ROLE_CAPABILITIES: Record<string, SimulationCapability[]> = {
  super_admin: ["view", "create", "analyze", "approve", "administer", "executive", "sensitive", "cross_domain"],
  agency_admin: ["view", "create", "analyze", "approve", "executive", "cross_domain"],
  agency_staff: ["view", "create", "analyze"],
  client_user: ["view", "executive"],
  worker: ["view"],
};

export function simulationCapabilities(roles: string[]): Set<SimulationCapability> {
  const set = new Set<SimulationCapability>();
  roles.forEach((r) => (ROLE_CAPABILITIES[r] ?? []).forEach((c) => set.add(c)));
  return set;
}
