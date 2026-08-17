// IWOS Architecture & Governance Console — client contract
// (PC-5.10B / CapSpec-5.10B / PDNA-5.10B).
//
// This module contains NO architecture registry logic. It holds no architecture
// data, performs no dependency analysis and stores no contracts. It is a typed
// description of the canonical Phase 5.10A Architecture Registry surface plus
// presentation taxonomies. Everything rendered by the console is returned by the
// registry; when the registry does not serve a capability the console says so.

export const PLATFORM_CONTRACT = "PC-5.10B";
export const CAPABILITY_SPEC = "CapSpec-5.10B";
export const PLATFORM_DNA = "PDNA-5.10B";
export const ARCHITECTURE_VERSION = "IWOS v1.5.0";
export const CONSTITUTION_VERSION = "v1.0";

/** The single canonical backend entry point for architecture data (5.10A). */
export const ARCHITECTURE_REGISTRY_FUNCTION = "architecture-api";

export type AppRoleLike = "super_admin" | "agency_admin" | "agency_owner";

/* ------------------------------------------------------------- capabilities */

export type ArchCapabilityKey =
  | "architecture.overview"
  | "organisms.list"
  | "organisms.detail"
  | "layers.list"
  | "domains.list"
  | "dependencies.graph"
  | "dependencies.impact"
  | "data.ownership"
  | "apis.catalog"
  | "events.catalog"
  | "permissions.registry"
  | "contracts.list"
  | "contracts.detail"
  | "capspecs.list"
  | "dna.list"
  | "adrs.list"
  | "constitution.read"
  | "versions.list"
  | "versions.compare"
  | "compatibility.matrix"
  | "health.report"
  | "debt.list"
  | "ip.register"
  | "search.query";

export interface ArchCapabilityDef {
  key: ArchCapabilityKey;
  label: string;
  description: string;
  /** Registry method invoked through the 5.10A API. */
  method: string;
  roles: AppRoleLike[];
}

export const CAPABILITIES: ArchCapabilityDef[] = [
  { key: "architecture.overview", label: "Architecture Overview", description: "Version, freeze status, counts, violations and debt.", method: "architecture.overview", roles: ["agency_admin", "super_admin"] },
  { key: "organisms.list", label: "Platform Organisms", description: "Every registered Platform Organism.", method: "organisms.list", roles: ["agency_admin", "super_admin"] },
  { key: "organisms.detail", label: "Organism Record", description: "Full canonical record for one organism.", method: "organisms.get", roles: ["agency_admin", "super_admin"] },
  { key: "layers.list", label: "Platform Layers", description: "Architectural layers and their organisms.", method: "layers.list", roles: ["agency_admin", "super_admin"] },
  { key: "domains.list", label: "Platform Domains", description: "Business/technical domains and ownership.", method: "domains.list", roles: ["agency_admin", "super_admin"] },
  { key: "dependencies.graph", label: "Dependency Graph", description: "Canonical dependency edges between organisms.", method: "dependencies.graph", roles: ["agency_admin", "super_admin"] },
  { key: "dependencies.impact", label: "Change Impact", description: "Registry-computed impact radius for a subject.", method: "dependencies.impact", roles: ["agency_admin", "super_admin"] },
  { key: "data.ownership", label: "Data Ownership", description: "Canonical owners, readers, writers and projections.", method: "data.ownership", roles: ["agency_admin", "super_admin"] },
  { key: "apis.catalog", label: "API Catalog", description: "Registered APIs with owners and consumers.", method: "apis.catalog", roles: ["agency_admin", "super_admin"] },
  { key: "events.catalog", label: "Event Catalog", description: "Registered events, publishers and consumers.", method: "events.catalog", roles: ["agency_admin", "super_admin"] },
  { key: "permissions.registry", label: "Permission Registry", description: "Permissions, roles, ABAC conditions and scope.", method: "permissions.registry", roles: ["agency_admin", "super_admin"] },
  { key: "contracts.list", label: "Platform Contracts", description: "Registered platform contracts.", method: "contracts.list", roles: ["agency_admin", "super_admin"] },
  { key: "contracts.detail", label: "Contract Record", description: "Structured contract document.", method: "contracts.get", roles: ["agency_admin", "super_admin"] },
  { key: "capspecs.list", label: "Capability Specifications", description: "Registered capability specifications.", method: "capspecs.list", roles: ["agency_admin", "super_admin"] },
  { key: "dna.list", label: "Platform DNA", description: "Registered Platform DNA records.", method: "dna.list", roles: ["agency_admin", "super_admin"] },
  { key: "adrs.list", label: "Architecture Decision Records", description: "ADR history and status.", method: "adrs.list", roles: ["agency_admin", "super_admin"] },
  { key: "constitution.read", label: "Constitution", description: "Constitutional volumes, articles and principles.", method: "constitution.read", roles: ["agency_admin", "super_admin"] },
  { key: "versions.list", label: "Versions", description: "Architecture, organism, API, contract and schema versions.", method: "versions.list", roles: ["agency_admin", "super_admin"] },
  { key: "versions.compare", label: "Version Comparison", description: "Registry-computed diff between two versions.", method: "versions.compare", roles: ["agency_admin", "super_admin"] },
  { key: "compatibility.matrix", label: "Compatibility Matrix", description: "Declared compatibility between versioned components.", method: "compatibility.matrix", roles: ["agency_admin", "super_admin"] },
  { key: "health.report", label: "Architecture Health", description: "Drift, duplication, dead services and violations.", method: "health.report", roles: ["agency_admin", "super_admin"] },
  { key: "debt.list", label: "Technical Debt", description: "Registered technical debt items.", method: "debt.list", roles: ["agency_admin", "super_admin"] },
  { key: "ip.register", label: "IP Register", description: "Intellectual property review entries.", method: "ip.register", roles: ["super_admin"] },
  { key: "search.query", label: "Engineering Search", description: "Universal search across the architecture registry.", method: "search.query", roles: ["agency_admin", "super_admin"] },
];

export const capabilityByKey = (key: ArchCapabilityKey): ArchCapabilityDef =>
  CAPABILITIES.find((c) => c.key === key) ?? {
    key, label: key, description: "", method: key, roles: ["super_admin"],
  };

/* ---------------------------------------------------------------- taxonomies */

export type StabilityLevel = "experimental" | "beta" | "stable" | "deprecated" | "retired";

export const STABILITY_STYLES: Record<StabilityLevel, string> = {
  experimental: "border-fuchsia-500/50 bg-fuchsia-500/10 text-fuchsia-300",
  beta: "border-sky-500/50 bg-sky-500/10 text-sky-300",
  stable: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  deprecated: "border-amber-500/60 bg-amber-500/10 text-amber-400",
  retired: "border-slate-500/50 bg-slate-500/10 text-slate-300",
};

export const normalizeStability = (v: unknown): StabilityLevel | null => {
  const s = String(v ?? "").toLowerCase();
  return (Object.keys(STABILITY_STYLES) as StabilityLevel[]).includes(s as StabilityLevel)
    ? (s as StabilityLevel)
    : null;
};

export type SeverityLevel = "info" | "low" | "medium" | "high" | "critical";

export const SEVERITY_STYLES: Record<SeverityLevel, string> = {
  info: "border-slate-500/50 bg-slate-500/10 text-slate-300",
  low: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  medium: "border-amber-500/50 bg-amber-500/10 text-amber-400",
  high: "border-orange-500/60 bg-orange-500/10 text-orange-400",
  critical: "border-red-500/60 bg-red-500/10 text-red-400",
};

export const normalizeSeverity = (v: unknown): SeverityLevel | null => {
  const s = String(v ?? "").toLowerCase();
  return (Object.keys(SEVERITY_STYLES) as SeverityLevel[]).includes(s as SeverityLevel)
    ? (s as SeverityLevel)
    : null;
};

/** IP review states — displayed only, never determined by this console. */
export const IP_STATUSES = [
  "UNREVIEWED", "PATENT REVIEW", "TRADE SECRET REVIEW",
  "COPYRIGHT DOCUMENTATION", "TRADEMARK REVIEW", "OPEN STANDARD CANDIDATE",
] as const;

/** Sections of an organism record rendered by the Organism Explorer. */
export const ORGANISM_SECTIONS: Array<{ key: string; label: string }> = [
  { key: "identity", label: "Identity" },
  { key: "purpose", label: "Purpose" },
  { key: "responsibilities", label: "Responsibilities" },
  { key: "capabilities", label: "Capabilities" },
  { key: "layer", label: "Layer" },
  { key: "domain", label: "Domain" },
  { key: "architecture_version", label: "Architecture Version" },
  { key: "version", label: "Current Version" },
  { key: "platform_contract", label: "Platform Contract" },
  { key: "capspec", label: "Capability Specification" },
  { key: "platform_dna", label: "Platform DNA" },
  { key: "constitution_references", label: "Constitution References" },
  { key: "data_ownership", label: "Data Ownership" },
  { key: "apis", label: "APIs" },
  { key: "events", label: "Events" },
  { key: "permissions", label: "Permissions" },
  { key: "dependencies", label: "Dependencies" },
  { key: "dependents", label: "Dependents" },
  { key: "health", label: "Health" },
  { key: "metrics", label: "Metrics" },
  { key: "failure_modes", label: "Failure Modes" },
  { key: "recovery", label: "Recovery" },
  { key: "version_history", label: "Version History" },
  { key: "ip_review_status", label: "IP Review Status" },
];

/** Change-impact subject kinds the registry can analyse. */
export const IMPACT_SUBJECTS = [
  { key: "organism", label: "Platform Organism" },
  { key: "service", label: "Service" },
  { key: "api", label: "API" },
  { key: "event", label: "Event" },
  { key: "schema", label: "Schema" },
  { key: "contract", label: "Contract" },
  { key: "permission", label: "Permission" },
] as const;

export type ImpactSubject = typeof IMPACT_SUBJECTS[number]["key"];

/** Architecture health checks reported by the registry. */
export const HEALTH_CHECKS: Array<{ key: string; label: string }> = [
  { key: "circular_dependencies", label: "Circular Dependencies" },
  { key: "duplicate_ownership", label: "Duplicate Ownership" },
  { key: "contract_drift", label: "Contract Drift" },
  { key: "event_drift", label: "Event Drift" },
  { key: "api_drift", label: "API Drift" },
  { key: "permission_drift", label: "Permission Drift" },
  { key: "dead_services", label: "Dead Services" },
  { key: "unused_apis", label: "Unused APIs" },
  { key: "unused_events", label: "Unused Events" },
  { key: "missing_capspecs", label: "Missing CapSpecs" },
  { key: "missing_platform_dna", label: "Missing Platform DNA" },
  { key: "architecture_violations", label: "Architecture Violations" },
  { key: "technical_debt", label: "Technical Debt" },
];

/** Version families exposed by the Version Explorer. */
export const VERSION_KINDS = [
  { key: "architecture", label: "Architecture" },
  { key: "organism", label: "Organism" },
  { key: "api", label: "API" },
  { key: "contract", label: "Contract" },
  { key: "capspec", label: "CapSpec" },
  { key: "schema", label: "Schema" },
  { key: "event", label: "Event" },
  { key: "constitution", label: "Constitution" },
] as const;

export type VersionKind = typeof VERSION_KINDS[number]["key"];

/* ------------------------------------------------------ engineering assistant */

export type EngineerTask =
  | "locate" | "explain_dependencies" | "summarize_contract"
  | "affected_components" | "architecture_history" | "find_adrs" | "investigation_path";

export const ENGINEER_TASKS: Array<{ key: EngineerTask; label: string; prompt: string }> = [
  { key: "locate", label: "Locate architecture", prompt: "Using only the supplied Architecture Registry records, locate the relevant organisms, services and files. Cite each record id you rely on. If the registry does not contain the answer, say so explicitly." },
  { key: "explain_dependencies", label: "Explain dependencies", prompt: "Explain the dependency relationships present in the supplied registry records, including direction and criticality. Cite record ids. Do not infer dependencies that are not present." },
  { key: "summarize_contract", label: "Summarize contract", prompt: "Summarize the supplied platform contract / capability specification faithfully. Do not add obligations that are not written in the document." },
  { key: "affected_components", label: "Identify affected components", prompt: "From the supplied registry records only, list components that would be affected by the described change, and state what is unknown." },
  { key: "architecture_history", label: "Explain architecture history", prompt: "Explain how this part of the architecture evolved using only the supplied version history records." },
  { key: "find_adrs", label: "Find relevant ADRs", prompt: "Identify which of the supplied ADRs are relevant and why. Do not invent ADRs." },
  { key: "investigation_path", label: "Suggest investigation path", prompt: "Suggest an ordered investigation path through the supplied registry records for an engineer diagnosing this area." },
];

/* ------------------------------------------------------------------ settings */

export type ConsoleDensity = "comfortable" | "dense";

export interface ArchSettings {
  density: ConsoleDensity;
  refreshMs: number;
  treeWidth: number;
  showRegistryIds: boolean;
}

export const DEFAULT_ARCH_SETTINGS: ArchSettings = {
  density: "dense",
  refreshMs: 60000,
  treeWidth: 260,
  showRegistryIds: true,
};

export const ARCH_SETTINGS_KEY = "iwos.architecture.settings.v1";

/* ------------------------------------------------------------- local store */

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — the workspace simply does not persist */
  }
}

/* --------------------------------------------------------------- utilities */

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map((v) => asRecord(v)) : [];
}

export function str(value: unknown, fallback = ""): string {
  return value == null ? fallback : String(value);
}

export function num(value: unknown): number | null {
  const n = Number(value);
  return value == null || value === "" || Number.isNaN(n) ? null : n;
}

export function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => (typeof v === "string" ? v : str(asRecord(v).name ?? asRecord(v).id ?? JSON.stringify(v))));
  if (typeof value === "string" && value.trim()) return [value];
  return [];
}

/** Case-insensitive substring match across every scalar in a record. */
export function matchesQuery(row: Record<string, unknown>, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return JSON.stringify(row).toLowerCase().includes(q);
}
