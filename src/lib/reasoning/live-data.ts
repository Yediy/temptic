// Presentation adapter over persisted WOIC results. Never infer conclusions or conflicts.
import { asArray, asRecord, normalizeRequestState, redactPrivate, str, type ReasoningCapabilityKey } from "./platform";

type Row = Record<string, unknown>;
export class CapabilityPending extends Error {}
export class CapabilityForbidden extends Error {}

export const LIVE_READS = new Set<ReasoningCapabilityKey>([
  "reasoning.overview", "reasoning.requests.list", "reasoning.requests.get",
  "reasoning.conclusions.list", "reasoning.conclusions.get", "reasoning.evidence.list",
  "reasoning.contradictions.list", "reasoning.critique.list", "reasoning.disagreements.list",
]);

function requestState(value: unknown) {
  const raw = str(value).toLowerCase();
  if (raw === "ok" || raw === "completed") return "COMPLETED";
  if (raw === "error") return "FAILED";
  return normalizeRequestState(value) ?? value;
}

function evidenceRows(trace: Row, output: Row = {}): Row[] {
  return asArray(output.evidence ?? trace.evidence).map((item, index) => ({
    ...item,
    id: str(item.id) || `${str(trace.id)}:evidence:${index}`,
    summary: item.summary ?? item.statement ?? item.detail ?? item.description,
    // Capture time of the trace is not the observation time of the evidence.
    captured_at: item.captured_at ?? item.observed_at,
    stance: item.stance ?? item.classification,
    used_in: item.used_in ?? [trace.id],
    provenance: { ...asRecord(item.provenance), source: item.source, trace_id: trace.id,
      source_record_id: item.source_record_id ?? item.ref_id, observed_at: item.observed_at },
  }));
}

function conclusionRow(trace: Row, output: Row): Row {
  const evidence = evidenceRows(trace, output);
  return {
    ...trace, ...output, id: trace.id, trace_id: trace.id,
    // A completed request does not establish that its conclusion is supported.
    status: output.conclusion_status ?? asRecord(output.conclusion_metadata).status,
    evidence,
    supporting_evidence: output.supporting_evidence ?? evidence.filter(e => str(e.stance).toUpperCase() === "SUPPORTS"),
    contradicting_evidence: output.contradicting_evidence ?? evidence.filter(e => str(e.stance).toUpperCase() === "CONTRADICTS"),
  };
}

/** Maps only records/fields actually reported by WOIC, preserving both sides of conflicts. */
export function adaptLiveRead(capability: ReasoningCapabilityKey, requests: Row[], traces: Row[], params: Row = {}): unknown {
  const traceById = new Map(traces.map(t => [str(t.id), t]));
  const outputByTrace = new Map<string, Row>();
  for (const request of requests) {
    const output = asRecord(request.output);
    const id = str(output.trace_id);
    // Input arrives newest first; don't replace a newer output with an older cached one.
    if (id && !outputByTrace.has(id)) outputByTrace.set(id, output);
  }
  const requestRows = requests.map(request => {
    const output = asRecord(request.output), input = asRecord(request.input);
    const trace = traceById.get(str(output.trace_id));
    return {
      ...trace, ...output, ...request, id: request.id, trace_id: output.trace_id,
      objective: input.question ?? input.objective ?? trace?.question ?? output.question,
      status: requestState(request.status),
      confidence: output.confidence ?? trace?.confidence,
      evidence: trace ? evidenceRows(trace, output) : output.evidence,
      conclusions: output.conclusions ?? output.conclusion ?? trace?.conclusion,
      context: input.context, constraints: input.constraints, assumptions: output.assumptions,
      model_metadata: { model: request.model, cached: request.cached, latency_ms: request.latency_ms },
    };
  });
  const conclusions = traces.filter(t => t.conclusion != null && t.conclusion !== "")
    .map(t => conclusionRow(t, outputByTrace.get(str(t.id)) ?? {}));

  let result: unknown;
  if (capability === "reasoning.requests.list") result = requestRows;
  else if (capability === "reasoning.requests.get") {
    result = requestRows.find(r => r.id === params.request_id);
    if (!result) throw new Error("Reasoning request not found in this organization.");
  } else if (capability === "reasoning.conclusions.list") result = conclusions;
  else if (capability === "reasoning.conclusions.get") {
    result = conclusions.find(r => r.id === params.conclusion_id);
    if (!result) throw new Error("Conclusion not found in this organization.");
  } else if (capability === "reasoning.evidence.list") {
    result = traces.flatMap(t => evidenceRows(t, outputByTrace.get(str(t.id)) ?? {}));
  } else if (capability === "reasoning.overview") {
    result = {
      active_requests: requestRows.filter(r => ["QUEUED", "GATHERING_EVIDENCE", "REASONING", "CRITIQUING"].includes(str(r.status))).length,
      conclusions_generated: conclusions.length,
      notes: "Live WOIC records. Unreported metrics are unavailable.",
    };
  } else {
    const fields: Partial<Record<ReasoningCapabilityKey, string[]>> = {
      "reasoning.contradictions.list": ["contradictions"],
      "reasoning.critique.list": ["critical_reviews", "reviews", "critical_review", "critique"],
      "reasoning.disagreements.list": ["model_disagreements", "disagreements"],
    };
    let reported = false;
    const rows: Row[] = [];
    for (const request of requests) {
      const output = asRecord(request.output);
      for (const field of fields[capability] ?? []) {
        if (!Object.prototype.hasOwnProperty.call(output, field) || output[field] == null) continue;
        reported = true;
        const value = output[field];
        const items = Array.isArray(value) ? asArray(value) : [asRecord(value)];
        items.forEach((item, index) => rows.push({
          ...item, id: str(item.id) || `${str(request.id)}:${field}:${index}`,
          request_id: request.id, trace_id: output.trace_id,
          subject: item.subject ?? item.topic ?? output.question ?? asRecord(request.input).question,
          detected_at: item.detected_at ?? request.created_at,
          reviewed_at: item.reviewed_at ?? request.created_at,
          side_a: item.side_a ?? item.claim_a ?? item.a,
          side_b: item.side_b ?? item.claim_b ?? item.b,
        }));
        break;
      }
    }
    if (!reported) throw new CapabilityPending("WOIC has not exposed this capability in its live results; the dedicated 6.3A service is not deployed.");
    result = rows;
  }
  return redactPrivate(result);
}