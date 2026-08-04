// IWOS Automation Studio — shared catalog of node types, triggers, conditions
// and actions. Pure metadata: execution happens server-side in the Automation
// Intelligence Engine (ttos-dispatch / process-automation-events).

export type NodeKind =
  | "trigger"
  | "condition"
  | "decision"
  | "approval"
  | "delay"
  | "timer"
  | "loop"
  | "parallel"
  | "merge"
  | "communication"
  | "document"
  | "payroll"
  | "compliance"
  | "recruiting"
  | "training"
  | "identity"
  | "passport"
  | "twin"
  | "ai"
  | "api"
  | "webhook"
  | "custom"
  | "robot"
  | "comment";

export type NodeTypeDef = {
  kind: NodeKind;
  label: string;
  group: "Flow" | "Logic" | "Workforce" | "Intelligence" | "Integration" | "Docs";
  description: string;
  /** Action type emitted to the engine (null for pure-flow nodes). */
  actionType: string | null;
  accent: string; // tailwind token-based class
};

export const NODE_TYPES: NodeTypeDef[] = [
  { kind: "trigger", label: "Trigger", group: "Flow", description: "Starts the workflow from an Event Fabric event.", actionType: null, accent: "border-primary/60" },
  { kind: "condition", label: "Condition", group: "Logic", description: "Continue only when the expression matches.", actionType: null, accent: "border-amber-500/60" },
  { kind: "decision", label: "Decision", group: "Logic", description: "Branch into multiple labelled paths.", actionType: null, accent: "border-amber-500/60" },
  { kind: "approval", label: "Approval", group: "Logic", description: "Pause for a human approver before continuing.", actionType: "request_approval", accent: "border-amber-500/60" },
  { kind: "delay", label: "Delay", group: "Flow", description: "Wait a fixed duration.", actionType: "delay", accent: "border-muted-foreground/40" },
  { kind: "timer", label: "Timer", group: "Flow", description: "Wait until a scheduled moment.", actionType: "timer", accent: "border-muted-foreground/40" },
  { kind: "loop", label: "Loop", group: "Flow", description: "Repeat downstream nodes over a collection.", actionType: "loop", accent: "border-muted-foreground/40" },
  { kind: "parallel", label: "Parallel", group: "Flow", description: "Fan out into concurrent branches.", actionType: null, accent: "border-muted-foreground/40" },
  { kind: "merge", label: "Merge", group: "Flow", description: "Join concurrent branches back together.", actionType: null, accent: "border-muted-foreground/40" },
  { kind: "communication", label: "Communication", group: "Workforce", description: "Notify, email or message a recipient.", actionType: "notify", accent: "border-sky-500/60" },
  { kind: "document", label: "Document", group: "Docs", description: "Generate, request or archive a document.", actionType: "emit_event", accent: "border-sky-500/60" },
  { kind: "payroll", label: "Payroll", group: "Workforce", description: "Trigger a payroll or billing operation.", actionType: "emit_event", accent: "border-emerald-500/60" },
  { kind: "compliance", label: "Compliance", group: "Workforce", description: "Run a compliance or credential check.", actionType: "emit_event", accent: "border-emerald-500/60" },
  { kind: "recruiting", label: "Recruiting", group: "Workforce", description: "Advance a candidate or job order.", actionType: "emit_event", accent: "border-emerald-500/60" },
  { kind: "training", label: "Training", group: "Workforce", description: "Assign or verify training.", actionType: "emit_event", accent: "border-emerald-500/60" },
  { kind: "identity", label: "Identity", group: "Workforce", description: "Verify identity or right to work.", actionType: "emit_event", accent: "border-emerald-500/60" },
  { kind: "passport", label: "Passport", group: "Workforce", description: "Update the Workforce Passport.", actionType: "emit_event", accent: "border-emerald-500/60" },
  { kind: "twin", label: "Digital Twin", group: "Intelligence", description: "Refresh or query the worker's Digital Twin.", actionType: "emit_event", accent: "border-violet-500/60" },
  { kind: "ai", label: "AI / WOIC", group: "Intelligence", description: "Ask WOIC to reason, predict or recommend.", actionType: "run_agent", accent: "border-violet-500/60" },
  { kind: "api", label: "API Call", group: "Integration", description: "Call an internal IWOS API.", actionType: "call_webhook", accent: "border-cyan-500/60" },
  { kind: "webhook", label: "Webhook", group: "Integration", description: "POST a payload to an external system.", actionType: "call_webhook", accent: "border-cyan-500/60" },
  { kind: "custom", label: "Custom", group: "Integration", description: "Custom engine action defined by payload.", actionType: "emit_event", accent: "border-cyan-500/60" },
  { kind: "robot", label: "Robot (future)", group: "Integration", description: "Reserved for autonomous field robotics.", actionType: "emit_event", accent: "border-cyan-500/60" },
  { kind: "comment", label: "Comment", group: "Docs", description: "Annotation only — never executed.", actionType: null, accent: "border-dashed border-muted-foreground/40" },
];

export const NODE_TYPE_MAP: Record<NodeKind, NodeTypeDef> = NODE_TYPES.reduce(
  (acc, n) => ({ ...acc, [n.kind]: n }),
  {} as Record<NodeKind, NodeTypeDef>,
);

export type TriggerDef = { event: string; label: string; category: string };

export const TRIGGERS: TriggerDef[] = [
  { event: "worker.created", label: "Worker Created", category: "Workforce" },
  { event: "worker.updated", label: "Worker Updated", category: "Workforce" },
  { event: "job.created", label: "Job Posted", category: "Recruiting" },
  { event: "candidate.applied", label: "Candidate Applied", category: "Recruiting" },
  { event: "interview.scheduled", label: "Interview Scheduled", category: "Recruiting" },
  { event: "interview.completed", label: "Interview Completed", category: "Recruiting" },
  { event: "offer.accepted", label: "Offer Accepted", category: "Recruiting" },
  { event: "assignment.started", label: "Assignment Started", category: "Operations" },
  { event: "assignment.completed", label: "Assignment Completed", category: "Operations" },
  { event: "training.completed", label: "Training Completed", category: "Training" },
  { event: "certification.earned", label: "Certification Earned", category: "Training" },
  { event: "document.signed", label: "Document Signed", category: "Documents" },
  { event: "payroll.approved", label: "Payroll Approved", category: "Finance" },
  { event: "invoice.paid", label: "Invoice Paid", category: "Finance" },
  { event: "organization.created", label: "Organization Created", category: "Platform" },
  { event: "screening.completed", label: "Background Check Complete", category: "Compliance" },
  { event: "identity.verified", label: "Identity Verified", category: "Compliance" },
  { event: "ticket.sent", label: "Ticket Sent", category: "Time Tickets" },
  { event: "ticket.signed", label: "Ticket Signed", category: "Time Tickets" },
  { event: "ticket.rejected", label: "Ticket Rejected", category: "Time Tickets" },
  { event: "schedule.tick", label: "Schedule Trigger", category: "System" },
  { event: "webhook.received", label: "Webhook Trigger", category: "System" },
  { event: "manual.run", label: "Manual Trigger", category: "System" },
  { event: "*", label: "Custom / Any Event", category: "System" },
];

export type ConditionOperator =
  | "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "in" | "contains"
  | "before" | "after" | "matches";

export const CONDITION_OPERATORS: { value: ConditionOperator; label: string; hint: string }[] = [
  { value: "eq", label: "equals", hint: "Exact match" },
  { value: "neq", label: "not equals", hint: "Inverse match" },
  { value: "gt", label: "greater than", hint: "Numeric" },
  { value: "gte", label: "greater or equal", hint: "Numeric" },
  { value: "lt", label: "less than", hint: "Numeric" },
  { value: "lte", label: "less or equal", hint: "Numeric" },
  { value: "in", label: "in list", hint: "Comma separated values" },
  { value: "contains", label: "contains", hint: "Substring / array member" },
  { value: "before", label: "before date", hint: "Date comparison" },
  { value: "after", label: "after date", hint: "Date comparison" },
  { value: "matches", label: "matches expression", hint: "Custom expression" },
];

export const CONDITION_JOINERS = ["and", "or", "not"] as const;
export type ConditionJoiner = (typeof CONDITION_JOINERS)[number];

export const CONDITION_PRESETS: { label: string; field: string; operator: ConditionOperator; value: string; group: string }[] = [
  { label: "Role is", field: "actor.role", operator: "eq", value: "agency_admin", group: "Role" },
  { label: "Organization is", field: "payload.agency_id", operator: "eq", value: "", group: "Organization" },
  { label: "Compliance status", field: "payload.compliance_status", operator: "eq", value: "clear", group: "Compliance" },
  { label: "AI confidence above", field: "ai.confidence", operator: "gte", value: "0.8", group: "AI" },
  { label: "AI recommendation is", field: "ai.recommendation", operator: "eq", value: "approve", group: "AI" },
  { label: "Effective date after", field: "payload.effective_date", operator: "after", value: "", group: "Date" },
  { label: "Custom expression", field: "payload.value", operator: "matches", value: "", group: "Custom" },
];

export const ACTION_TYPES: { type: string; label: string; description: string; fields: string[] }[] = [
  { type: "notify", label: "Notify", description: "Create an in-app notification for a role or user.", fields: ["title", "level", "audience"] },
  { type: "create_task", label: "Create Task", description: "Open a TTOS task with an owner and due date.", fields: ["title", "assignee", "due_in_hours"] },
  { type: "emit_event", label: "Emit Event", description: "Publish a new event onto the Event Fabric.", fields: ["event_type", "payload"] },
  { type: "run_agent", label: "Run AI Agent", description: "Invoke a WOIC agent with the event context.", fields: ["agent_id", "instruction"] },
  { type: "call_webhook", label: "Call Webhook", description: "POST the payload to an external endpoint.", fields: ["url", "secret_name"] },
  { type: "request_approval", label: "Request Approval", description: "Route to an approver before continuing.", fields: ["approver_role", "sla_hours"] },
  { type: "delay", label: "Delay", description: "Pause the workflow for a duration.", fields: ["minutes"] },
  { type: "timer", label: "Timer", description: "Resume at a specific timestamp.", fields: ["run_at"] },
  { type: "loop", label: "Loop", description: "Iterate downstream nodes over a collection.", fields: ["collection", "max_iterations"] },
];

export const LIBRARY_CATEGORIES = [
  "Recruiting", "Onboarding", "Compliance", "Training", "Scheduling", "Payroll",
  "Invoices", "Performance", "Safety", "Construction", "Healthcare",
  "Manufacturing", "Education", "Government", "Custom",
] as const;
