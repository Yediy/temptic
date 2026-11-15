// Privacy classification, sensitive-marker detection, permission tiers and evidence provenance.
// Display layer only: RLS + woic-policy remain the data boundary. Values of restricted keys are never returned.
import { isForbiddenKey } from "@/lib/perception/platform";
import { WOIC_MODULE_SCOPES, WOIC_ROLE_MATRIX } from "@/lib/woic/policy";

export type PrivacyClass = "restricted" | "sensitive" | "internal" | "general";
export type PrivacyTier = "none" | "staff" | "admin" | "super";

export const SENSITIVE_KEY = /(email|phone|ssn|social_security|dob|birth|address|password|token|secret|salary|pay_rate|bill_rate|bank|routing|account_number|tax|medical|drug|screening|background)/i;
const INTERNAL_KEY = /(^|_)(ip|user_agent|actor_id|user_id|session|trace|model|latency)($|_)/i;

export const CLASS_DESCRIPTION: Record<PrivacyClass, string> = {
  restricted: "Never rendered — private reasoning or restricted payloads are stripped at the boundary.",
  sensitive: "Personal or financial data — masked unless you are an agency admin.",
  internal: "Operational metadata — visible to agency admins.",
  general: "Business context visible to anyone with perception access.",
};

export function classifyKey(key: string): PrivacyClass {
  if (isForbiddenKey(key)) return "restricted";
  if (SENSITIVE_KEY.test(key)) return "sensitive";
  if (INTERNAL_KEY.test(key)) return "internal";
  return "general";
}

const STAFF = ["dispatcher", "recruiter", "account_manager", "scheduler", "onboarding_specialist", "compliance_specialist", "payroll", "payroll_specialist", "billing_specialist", "viewer"];
export function privacyTier(roles: readonly string[]): PrivacyTier {
  if (roles.includes("super_admin")) return "super";
  if (roles.some((r) => ["agency_admin", "agency_owner"].includes(r))) return "admin";
  if (roles.some((r) => STAFF.includes(r))) return "staff";
  return "none";
}

/** Can this tier see the value for a field of this class? */
export function canViewClass(tier: PrivacyTier, cls: PrivacyClass): boolean {
  if (cls === "restricted" || tier === "none") return false;
  if (cls === "general") return true;
  return tier === "admin" || tier === "super";
}

export interface Marker { path: string; cls: PrivacyClass }
/** Lists key paths holding restricted/sensitive data. Returns paths only, never values. */
export function scanMarkers(value: unknown, base = ""): Marker[] {
  const out: Marker[] = [];
  const walk = (v: unknown, p: string) => {
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`));
    else if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
        const path = p ? `${p}.${k}` : k;
        const cls = classifyKey(k);
        if (cls === "restricted" || cls === "sensitive") out.push({ path, cls });
        if (cls !== "restricted") walk(x, path);
      }
    }
  };
  walk(value, base);
  return out;
}

/** Copy of value with fields the tier may not see replaced by a marker string. */
export function scopeValue(value: unknown, tier: PrivacyTier): unknown {
  if (Array.isArray(value)) return value.map((v) => scopeValue(v, tier));
  if (value && typeof value === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const cls = classifyKey(k);
      if (cls === "restricted") { o[k] = "[restricted — excluded]"; continue; }
      o[k] = canViewClass(tier, cls) ? scopeValue(v, tier) : `[${cls} — hidden for your role]`;
    }
    return o;
  }
  return value;
}

export interface ScopeRule { resource: string; read: boolean; write: boolean; readRoles?: string[]; writeRoles?: string[] }
export interface PrivacyView {
  tier: PrivacyTier;
  classification: { cls: PrivacyClass; description: string; visible: boolean }[];
  markers: Marker[] | null;            // admin+
  tenantScope: { agencyId: string | null; rules: ScopeRule[] } | null; // admin+: own rules; super: role lists
  moduleScopes: Record<string, string[]> | null; // super only
}

export function buildPrivacyView(roles: readonly string[], agencyId: string | null, samples: unknown[]): PrivacyView {
  const tier = privacyTier(roles);
  const classification = (Object.keys(CLASS_DESCRIPTION) as PrivacyClass[]).map((cls) => ({
    cls, description: CLASS_DESCRIPTION[cls], visible: canViewClass(tier, cls),
  }));
  const admin = tier === "admin" || tier === "super";
  const markers = admin ? dedupe(samples.flatMap((s) => scanMarkers(s))) : null;
  const rules: ScopeRule[] = Object.entries(WOIC_ROLE_MATRIX).map(([resource, m]) => ({
    resource,
    read: m.read.some((r) => roles.includes(r)),
    write: m.write.some((r) => roles.includes(r)),
    ...(tier === "super" ? { readRoles: m.read, writeRoles: m.write } : {}),
  }));
  return {
    tier, classification, markers,
    tenantScope: admin ? { agencyId: tier === "super" ? null : agencyId, rules } : null,
    moduleScopes: tier === "super" ? (WOIC_MODULE_SCOPES as Record<string, string[]>) : null,
  };
}

function dedupe(ms: Marker[]): Marker[] {
  const seen = new Map<string, Marker>();
  for (const m of ms) seen.set(m.path.replace(/\[\d+\]/g, "[]"), { ...m, path: m.path.replace(/\[\d+\]/g, "[]") });
  return [...seen.values()];
}

/* ------------------------------------------------------------ provenance */

export interface ProvenanceStep { label: string; value: string | null }
export interface Provenance {
  chain: ProvenanceStep[];
  fields: { key: string; cls: PrivacyClass; visible: boolean }[];
  withheld: number;
  scoped: unknown;
}

/** Traces an evidence/observation item back to its origin; contents are tier-scoped. */
export function buildProvenance(
  raw: Record<string, unknown>,
  ctx: { requestId?: string | null; traceId?: string | null; operation?: string | null; source?: string | null; ref?: string | null; observedAt?: string | null },
  tier: PrivacyTier,
): Provenance {
  const str = (v: unknown) => (v == null || v === "" ? null : String(v));
  const chain: ProvenanceStep[] = [
    { label: "Origin source", value: ctx.source ?? str(raw.source ?? raw.kind ?? raw.module) },
    { label: "Source record", value: [str(raw.ref_entity ?? raw.entity_type), ctx.ref ?? str(raw.ref_id ?? raw.entity_id)].filter(Boolean).join(" ") || null },
    { label: "Observed at", value: ctx.observedAt ?? str(raw.observed_at ?? raw.timestamp ?? raw.created_at) },
    { label: "Captured by", value: str(raw.collector ?? raw.captured_by) ?? (ctx.traceId ? "WOIC reasoning trace" : null) },
    { label: "Reasoning trace", value: ctx.traceId ?? null },
    { label: "Cognitive request", value: [ctx.operation, ctx.requestId].filter(Boolean).join(" · ") || null },
  ];
  const fields = Object.keys(raw).map((key) => {
    const cls = classifyKey(key);
    return { key, cls, visible: canViewClass(tier, cls) };
  });
  return { chain, fields, withheld: fields.filter((f) => !f.visible).length, scoped: scopeValue(raw, tier) };
}
