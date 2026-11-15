import { describe, expect, it } from "vitest";
import { adaptLiveRead, CapabilityPending } from "./live-data";

const trace = { id: "trace-1", question: "Can this shift be staffed?", conclusion: "Staffing is feasible.", confidence: 0.8,
  evidence: [{ source: "schedule", detail: "Two workers are available." }], status: "completed" };
const request = { id: "request-1", input: { question: trace.question }, status: "ok", model: "existing-model",
  output: { trace_id: trace.id, conclusion: trace.conclusion, confidence: 0.8 } };

describe("live reasoning presentation", () => {
  it("joins requests to persisted traces and maps the recorded completion status", () => {
    const result = adaptLiveRead("reasoning.requests.get", [request], [trace], { request_id: request.id }) as Record<string, unknown>;
    expect(result.objective).toBe(trace.question);
    expect(result.status).toBe("COMPLETED");
    expect(result.conclusions).toBe(trace.conclusion);
    expect(result.confidence).toBe(0.8);
  });
  it("does not classify a completed conclusion as supported", () => {
    const result = adaptLiveRead("reasoning.conclusions.get", [request], [trace], { conclusion_id: trace.id }) as Record<string, unknown>;
    expect(result.status).toBeUndefined();
    expect(result.supporting_evidence).toEqual([]);
  });
  it("preserves evidence text and provenance without inventing stance or observation time", () => {
    const result = adaptLiveRead("reasoning.evidence.list", [request], [trace]) as Record<string, unknown>[];
    expect(result[0].summary).toBe("Two workers are available.");
    expect(result[0].stance).toBeUndefined();
    expect(result[0].captured_at).toBeUndefined();
    expect(result[0].provenance).toMatchObject({ source: "schedule", trace_id: "trace-1" });
  });
  it.each(["reasoning.contradictions.list", "reasoning.critique.list", "reasoning.disagreements.list"] as const)(
    "reports unavailable %s rather than invented empty results", capability => {
      expect(() => adaptLiveRead(capability, [request], [trace])).toThrow(CapabilityPending);
    },
  );
  it("distinguishes explicitly reported empty disagreements from unsupported disagreements", () => {
    expect(adaptLiveRead("reasoning.disagreements.list", [{ ...request, output: { disagreements: [] } }], [])).toEqual([]);
  });
  it("preserves both contradiction sides and strips private reasoning recursively", () => {
    const result = adaptLiveRead("reasoning.contradictions.list", [{ ...request, output: {
      contradictions: [{ a: "Available", b: "Unavailable", private_reasoning: "hidden", nested: { scratchpad: "hidden", source: "schedule" } }],
    } }], []) as Record<string, unknown>[];
    expect(result[0].side_a).toBe("Available");
    expect(result[0].side_b).toBe("Unavailable");
    expect(result[0]).not.toHaveProperty("private_reasoning");
    expect(result[0].nested).toEqual({ source: "schedule" });
  });
  it("rejects unknown detail IDs instead of returning a blank inspector", () => {
    expect(() => adaptLiveRead("reasoning.requests.get", [request], [trace], { request_id: "other" })).toThrow("not found");
  });
});