export type Row = Record<string, unknown>;
export const obj = (v: unknown): Row => v && typeof v === "object" && !Array.isArray(v) ? v as Row : {};
export const rows = (v: unknown): Row[] => Array.isArray(v) ? v.map(obj) : [];
export function supportedOutcome(outcome: string, evidence: Row[]) {
  return evidence.length ? outcome : "INSUFFICIENT_EVIDENCE";
}
export function redact(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(redact);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(obj(v)).filter(([k]) => !/chain.?of.?thought|scratchpad|private_reasoning|raw_prompt|system_prompt|hidden_reasoning|encrypted_content|deliberation_trace|internal_monologue|raw_thoughts|^thoughts$|^cot$/i.test(k)).map(([k, x]) => [k, redact(x)]));
  return v;
}
export function validateRefs(indices: number[], evidence: Row[]): Row[] {
  if (indices.some(i => !Number.isInteger(i) || i < 0 || i >= evidence.length)) throw new Error("Review referenced evidence that was not supplied.");
  return [...new Set(indices)].map(i => evidence[i]);
}
export function reviewItems(reviews: Row[], actions: Row[], field: string): Row[] {
  return reviews.filter(r => r.status === "completed").flatMap(r => rows(obj(r.result)[field]).map((item, i) => {
    const id = `${r.id}:${field}:${i}`;
    const escalated = actions.some(a => a.review_id === r.id && a.item_id === id);
    return { ...item, id, review_id: r.id, trace_id: r.trace_id, reviewed_at: r.created_at, detected_at: r.created_at, ...(escalated ? { status: "HUMAN_REVIEW_REQUIRED" } : {}) };
  }));
}