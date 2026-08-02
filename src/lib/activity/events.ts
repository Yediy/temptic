// Universal Event Fabric — shared taxonomy, colors, and helpers (IWOS 5.1B).

export interface FabricEvent {
  id: string;
  agency_id: string;
  module: string;
  name: string;
  actor_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  related_objects: unknown[] | null;
  correlation_id: string | null;
  processed_at: string | null;
  created_at: string;
}

export type EventCategory =
  | "workforce"
  | "operations"
  | "finance"
  | "compliance"
  | "intelligence"
  | "system";

export const CATEGORY_LABEL: Record<EventCategory, string> = {
  workforce: "Workforce",
  operations: "Operations",
  finance: "Finance",
  compliance: "Compliance",
  intelligence: "AI / WOIC",
  system: "System",
};

/** Tailwind token classes per category — semantic tokens only. */
export const CATEGORY_CLASS: Record<EventCategory, string> = {
  workforce: "bg-primary/10 text-primary border-primary/30",
  operations: "bg-accent/40 text-accent-foreground border-border",
  finance: "bg-secondary text-secondary-foreground border-border",
  compliance: "bg-destructive/10 text-destructive border-destructive/30",
  intelligence: "bg-primary/15 text-primary border-primary/40",
  system: "bg-muted text-muted-foreground border-border",
};

const MODULE_CATEGORY: Record<string, EventCategory> = {
  worker: "workforce",
  workers: "workforce",
  recruit: "workforce",
  onboarding: "workforce",
  training: "workforce",
  passport: "workforce",
  twin: "intelligence",
  woic: "intelligence",
  ai: "intelligence",
  automation: "intelligence",
  ticket: "operations",
  tickets: "operations",
  tto: "operations",
  scheduling: "operations",
  cc: "operations",
  client: "operations",
  pb: "finance",
  payroll: "finance",
  billing: "finance",
  invoice: "finance",
  compliance: "compliance",
  screening: "compliance",
  audit: "compliance",
  ttos: "system",
  system: "system",
};

export function categoryOf(evt: { module?: string | null; name?: string | null }): EventCategory {
  const m = (evt.module ?? "").toLowerCase();
  if (MODULE_CATEGORY[m]) return MODULE_CATEGORY[m];
  const prefix = (evt.name ?? "").split(".")[0]?.toLowerCase() ?? "";
  return MODULE_CATEGORY[prefix] ?? "system";
}

export type Severity = "critical" | "warning" | "info" | "success";

export function severityOf(evt: { status?: string | null; name?: string | null }): Severity {
  const s = (evt.status ?? "").toLowerCase();
  const n = (evt.name ?? "").toLowerCase();
  if (s === "failed" || s === "error" || n.includes("failed") || n.includes("rejected") || n.includes("breach"))
    return "critical";
  if (s === "retrying" || s === "pending" || n.includes("expiring") || n.includes("risk") || n.includes("warning"))
    return "warning";
  if (s === "processed" || n.includes("completed") || n.includes("signed") || n.includes("approved")) return "success";
  return "info";
}

export const SEVERITY_CLASS: Record<Severity, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/40",
  warning: "bg-primary/10 text-primary border-primary/30",
  info: "bg-muted text-muted-foreground border-border",
  success: "bg-secondary text-secondary-foreground border-border",
};

export function priorityOf(evt: { name?: string | null; status?: string | null }): "P1" | "P2" | "P3" {
  const sev = severityOf(evt);
  if (sev === "critical") return "P1";
  if (sev === "warning") return "P2";
  return "P3";
}

export function processingState(evt: FabricEvent): "queued" | "processing" | "processed" | "failed" {
  const s = (evt.status ?? "").toLowerCase();
  if (s === "failed" || s === "error") return "failed";
  if (evt.processed_at) return "processed";
  if (s === "processing") return "processing";
  return "queued";
}

export function durationMs(evt: FabricEvent): number | null {
  if (!evt.processed_at) return null;
  return new Date(evt.processed_at).getTime() - new Date(evt.created_at).getTime();
}

export function humanizeName(name: string): string {
  return name
    .split(".")
    .map((p) => p.replace(/_/g, " "))
    .join(" · ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
