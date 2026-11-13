// Builds a Context Pack drill-down from a WOIC cognitive request and its reasoning trace.
import { freshnessOf, type Freshness } from "@/lib/perception/observation-stream";

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec => (v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : {});
const arr = (v: unknown): Rec[] => (Array.isArray(v) ? v.map((x) => (typeof x === "object" && x ? (x as Rec) : { value: x })) : []);
const s = (v: unknown) => (v == null ? "" : String(v));

export interface EvidenceItem { id: string; source: string; claim: string; ref: string | null; observedAt: string | null; stance: "supports" | "contradicts" | "neutral"; freshness: Freshness | "UNKNOWN"; raw: Rec }
export interface Reference { kind: string; id: string; via: string }
export interface Contradiction { a: EvidenceItem; b: EvidenceItem; topic: string }
export interface ContextPack {
  id: string; request: Rec; trace: Rec | null; objective: string; createdAt: string;
  evidence: EvidenceItem[]; references: Reference[];
  coverage: { score: number; present: string[]; absent: string[] };
  freshness: { overall: Freshness | "UNKNOWN"; counts: Record<string, number> };
  missing: string[]; contradictions: Contradiction[];
}

export const COVERAGE_FACETS = ["objective", "subject", "evidence", "conclusion", "alternatives", "risk"] as const;

function stanceOf(e: Rec): EvidenceItem["stance"] {
  const v = s(e.stance ?? e.direction ?? e.supports).toLowerCase();
  if (v === "false" || /contra|against|refut|oppos/.test(v)) return "contradicts";
  if (v === "true" || /support|for|confirm/.test(v)) return "supports";
  return "neutral";
}

export function buildContextPack(request: Rec, trace: Rec | null, now = Date.now()): ContextPack {
  const out = rec(request.output), inp = rec(request.input);
  const createdAt = s(request.created_at);
  const rawEv = arr(trace?.evidence).length ? arr(trace?.evidence) : arr(out.evidence);
  const evidence: EvidenceItem[] = rawEv.map((e, i) => {
    const observedAt = s(e.observed_at ?? e.timestamp ?? e.created_at) || null;
    return {
      id: s(e.id) || `ev-${i + 1}`,
      source: s(e.source ?? e.kind ?? e.type) || "unspecified",
      claim: s(e.claim ?? e.statement ?? e.summary ?? e.fact ?? e.value ?? e.description) || JSON.stringify(e),
      ref: s(e.ref_id ?? e.entity_id ?? e.id) || null,
      observedAt,
      stance: stanceOf(e),
      freshness: observedAt && !Number.isNaN(Date.parse(observedAt)) ? freshnessOf(observedAt, now) : "UNKNOWN",
      raw: e,
    };
  });

  const refs = new Map<string, Reference>();
  const add = (kind: string, id: unknown, via: string) => { const v = s(id); if (v) refs.set(`${kind}:${v}`, { kind, id: v, via }); };
  if (trace) { add("reasoning_trace", trace.id, "output.trace_id"); add(s(trace.subject_entity) || "subject", trace.subject_id, "trace subject"); }
  for (const [k, v] of Object.entries(inp)) if (/_id$/.test(k) && typeof v === "string") add(k.replace(/_id$/, ""), v, `input.${k}`);
  for (const e of rawEv) add(s(e.ref_entity ?? e.entity_type ?? e.source) || "evidence", e.ref_id ?? e.entity_id, "evidence");

  const objective = s(out.question ?? trace?.question ?? inp.question ?? inp.prompt ?? request.operation);
  const facets: Record<(typeof COVERAGE_FACETS)[number], boolean> = {
    objective: !!objective,
    subject: !!(trace?.subject_id || Object.keys(inp).some((k) => /_id$/.test(k))),
    evidence: evidence.length > 0,
    conclusion: !!(out.conclusion ?? trace?.conclusion),
    alternatives: arr(out.alternatives ?? trace?.alternatives).length > 0,
    risk: Object.keys(rec(out.risk ?? trace?.risk)).length > 0 || arr(out.risk ?? trace?.risk).length > 0,
  };
  const present = COVERAGE_FACETS.filter((f) => facets[f]);
  const absent = COVERAGE_FACETS.filter((f) => !facets[f]);

  const counts: Record<string, number> = {};
  for (const e of evidence) counts[e.freshness] = (counts[e.freshness] ?? 0) + 1;
  const order: (Freshness | "UNKNOWN")[] = ["EXPIRED", "STALE", "AGING", "CURRENT"];
  const overall = order.find((f) => counts[f]) ?? "UNKNOWN";

  const reported = [...arr(out.missing_information), ...arr(out.missing)].map((m) => s(m.value ?? m.field ?? m.description ?? JSON.stringify(m)));
  const missing = [...reported, ...absent.map((f) => `No ${f} recorded for this request`)];
  if (request.status && s(request.status) !== "ok" && s(request.status) !== "completed") missing.push(`Request status: ${s(request.status)}${request.error ? ` — ${s(request.error)}` : ""}`);
  if (counts.EXPIRED || counts.STALE) missing.push(`${(counts.EXPIRED ?? 0) + (counts.STALE ?? 0)} evidence item(s) are stale or expired`);

  const contradictions: Contradiction[] = [];
  const bySubject = new Map<string, EvidenceItem[]>();
  for (const e of evidence) { const k = e.ref ?? e.source; bySubject.set(k, [...(bySubject.get(k) ?? []), e]); }
  for (const [topic, items] of bySubject) {
    const sup = items.filter((e) => e.stance === "supports"), con = items.filter((e) => e.stance === "contradicts");
    for (const a of sup) for (const b of con) contradictions.push({ a, b, topic });
  }
  for (const c of arr(out.contradictions)) {
    const mk = (x: unknown, i: string): EvidenceItem => ({ id: i, source: "reported", claim: s(x), ref: null, observedAt: null, stance: "neutral", freshness: "UNKNOWN", raw: c });
    contradictions.push({ a: mk(c.a ?? c.claim_a ?? JSON.stringify(c), "a"), b: mk(c.b ?? c.claim_b ?? "", "b"), topic: s(c.topic ?? "reported") });
  }

  return {
    id: s(request.id), request, trace, objective, createdAt, evidence, references: [...refs.values()],
    coverage: { score: present.length / COVERAGE_FACETS.length, present, absent },
    freshness: { overall, counts }, missing, contradictions,
  };
}
