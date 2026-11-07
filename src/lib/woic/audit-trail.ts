// Normalizes WOIC requests, reasoning traces and decisions into one audit row
// shape so they can be searched by organization, correlation ID and source.

export type AuditKind = "request" | "trace" | "decision";

export interface AuditRow {
  id: string;
  kind: AuditKind;
  organizationId: string | null;
  correlationId: string;
  source: string;
  title: string;
  status: string | null;
  confidence: number | null;
  createdAt: string;
  evidence: unknown[];
  alternatives: unknown[];
  risk: unknown;
  raw: Record<string, unknown>;
}

type Json = Record<string, unknown> | null | undefined;

const asObj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : v == null ? [] : [v]);

/** Finds a correlation id in common payload locations; falls back to the record id. */
export function extractCorrelationId(fallback: string, ...payloads: Json[]): string {
  for (const p of payloads) {
    const o = asObj(p);
    const meta = asObj(o.metadata);
    const c = o.correlation_id ?? o.correlationId ?? meta.correlation_id ?? meta.correlationId;
    if (typeof c === "string" && c) return c;
  }
  return fallback;
}

export function fromRequest(r: any): AuditRow {
  return {
    id: r.id, kind: "request", organizationId: r.agency_id ?? null,
    correlationId: extractCorrelationId(r.id, r.input, r.output),
    source: [r.service, r.operation].filter(Boolean).join("."),
    title: asObj(r.input).question as string ?? r.operation ?? "Request",
    status: r.status ?? null, confidence: null, createdAt: r.created_at,
    evidence: asArr(asObj(r.output).evidence), alternatives: asArr(asObj(r.output).alternatives),
    risk: asObj(r.output).risk ?? null, raw: r,
  };
}

export function fromTrace(t: any): AuditRow {
  return {
    id: t.id, kind: "trace", organizationId: t.agency_id ?? null,
    correlationId: extractCorrelationId(t.id, asObj(t.risk), { correlation_id: asObj(t).correlation_id }),
    source: t.domain ?? "reasoning", title: t.question ?? "Reasoning trace",
    status: t.status ?? null, confidence: t.confidence ?? null, createdAt: t.created_at,
    evidence: asArr(t.evidence), alternatives: asArr(t.alternatives), risk: t.risk ?? null, raw: t,
  };
}

export function fromDecision(d: any, evidence: unknown[] = []): AuditRow {
  const src = asObj(d.source);
  return {
    id: d.id, kind: "decision", organizationId: d.agency_id ?? null,
    correlationId: extractCorrelationId(d.id, src),
    source: (src.engine as string) ?? (src.source as string) ?? d.kind ?? "decision",
    title: d.reasoning?.slice(0, 120) || d.kind || "Decision",
    status: d.outcome ?? null, confidence: d.confidence ?? null, createdAt: d.created_at,
    evidence, alternatives: asArr(d.alternative_options),
    risk: d.risk || d.impact ? { level: d.risk, impact: d.impact } : null, raw: d,
  };
}

export interface AuditFilter { organizationId?: string; correlationId?: string; source?: string; kind?: AuditKind | "all" }

export function filterAuditRows(rows: AuditRow[], f: AuditFilter): AuditRow[] {
  const org = f.organizationId?.trim().toLowerCase();
  const corr = f.correlationId?.trim().toLowerCase();
  const src = f.source?.trim().toLowerCase();
  return rows
    .filter((r) => !org || (r.organizationId ?? "").toLowerCase() === org)
    .filter((r) => !corr || r.correlationId.toLowerCase().includes(corr) || r.id.toLowerCase() === corr)
    .filter((r) => !src || src === "all" || r.source.toLowerCase().includes(src))
    .filter((r) => !f.kind || f.kind === "all" || r.kind === f.kind)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
