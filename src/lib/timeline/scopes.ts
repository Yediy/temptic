// Universal Timeline Workspace — scope definitions (IWOS 5.4B).
// Scopes are pure presentation-layer projections over the Universal Timeline
// Engine (ttos_events). No timeline logic lives here — only which slice of the
// fabric each workspace tab requests.

export type TimelineScopeKey =
  | "global"
  | "worker"
  | "organization"
  | "project"
  | "assignment"
  | "recruiting"
  | "compliance"
  | "payroll"
  | "communication"
  | "ai"
  | "automation"
  | "twin";

export interface TimelineScope {
  key: TimelineScopeKey;
  path: string;
  label: string;
  description: string;
  /** Module filter applied against the engine. Empty = all modules. */
  modules: string[];
  /** Optional entity_type hint used by the subject picker. */
  entityType?: string;
}

export const TIMELINE_SCOPES: TimelineScope[] = [
  {
    key: "global",
    path: "/timeline",
    label: "Global Timeline",
    description: "Every operational signal across IWOS, chronologically.",
    modules: [],
  },
  {
    key: "worker",
    path: "/timeline/worker",
    label: "Worker Timeline",
    description: "Workforce history: hiring, onboarding, training, passport, credentials.",
    modules: ["worker", "workers", "onboarding", "training", "passport"],
    entityType: "worker",
  },
  {
    key: "organization",
    path: "/timeline/organization",
    label: "Organization Timeline",
    description: "Agency and client organization history across every module.",
    modules: ["client", "cc", "ttos", "system"],
    entityType: "client",
  },
  {
    key: "project",
    path: "/timeline/project",
    label: "Project Timeline",
    description: "Job orders, sites, and project lifecycle history.",
    modules: ["job", "jobs", "scheduling", "recruit"],
    entityType: "job_order",
  },
  {
    key: "assignment",
    path: "/timeline/assignment",
    label: "Assignment Timeline",
    description: "Placements, shifts, tickets, and time capture history.",
    modules: ["ticket", "tickets", "tto", "scheduling"],
    entityType: "ticket",
  },
  {
    key: "recruiting",
    path: "/timeline/recruiting",
    label: "Recruiting Timeline",
    description: "Sourcing, pipeline movement, interviews, offers and placements.",
    modules: ["recruit"],
    entityType: "candidate",
  },
  {
    key: "compliance",
    path: "/timeline/compliance",
    label: "Compliance Timeline",
    description: "Screening, credentials, audits and compliance cases.",
    modules: ["compliance", "screening", "audit"],
  },
  {
    key: "payroll",
    path: "/timeline/payroll",
    label: "Payroll Timeline",
    description: "Payroll runs, invoices, payments, commissions and margins.",
    modules: ["pb", "payroll", "billing", "invoice"],
  },
  {
    key: "communication",
    path: "/timeline/communication",
    label: "Communication Timeline",
    description: "Threads, messages, notifications and client collaboration.",
    modules: ["cc", "notification", "messaging"],
  },
  {
    key: "ai",
    path: "/timeline/ai",
    label: "AI Timeline",
    description: "WOIC reasoning, recommendations, predictions and decisions.",
    modules: ["woic", "ai"],
  },
  {
    key: "automation",
    path: "/timeline/automation",
    label: "Automation Timeline",
    description: "Rule executions, agent runs, retries and dead letters.",
    modules: ["automation"],
  },
  {
    key: "twin",
    path: "/timeline/twin",
    label: "Digital Twin Timeline",
    description: "Twin capability, prediction and growth evolution.",
    modules: ["twin"],
    entityType: "worker",
  },
];

export function scopeByKey(key: TimelineScopeKey): TimelineScope {
  return TIMELINE_SCOPES.find((s) => s.key === key) ?? TIMELINE_SCOPES[0];
}
