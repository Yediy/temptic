import { describe, expect, it } from "vitest";
import { reviewItems, validateRefs, redact, supportedOutcome } from "../../../supabase/functions/woic-reasoning/result";

describe("live reasoning reviews", () => {
  it("never calls a conclusion supported without cited evidence", () => {
    expect(supportedOutcome("SUPPORTED", [])).toBe("INSUFFICIENT_EVIDENCE");
    expect(supportedOutcome("SUPPORTED", [{ id: "e1" }])).toBe("SUPPORTED");
  });
  it("never invents evidence references", () => {
    expect(validateRefs([0], [{ id: "e1" }])).toEqual([{ id: "e1" }]);
    expect(() => validateRefs([1], [{ id: "e1" }])).toThrow("not supplied");
    expect(() => validateRefs([-1], [{ id: "e1" }])).toThrow();
    expect(() => validateRefs([0.5], [{ id: "e1" }])).toThrow();
  });
  it("does not display unfinished or failed review output", () => {
    const result = { critical_reviews: [{ subject: "Recorded question" }] };
    expect(reviewItems([{ id: "r1", status: "failed", result }, { id: "r2", status: "running", result }], [], "critical_reviews")).toEqual([]);
  });
  it("preserves both model positions and marks recorded human escalation", () => {
    const result = { model_disagreements: [{ position_a: "Approve", position_b: "Do not approve", confidence_a: 0.8, confidence_b: 0.6, status: "UNRESOLVED" }] };
    const items = reviewItems([{ id: "r1", status: "completed", result }], [{ review_id: "r1", item_id: "r1:model_disagreements:0" }], "model_disagreements");
    expect(items[0]).toMatchObject({ position_a: "Approve", position_b: "Do not approve", confidence_a: 0.8, confidence_b: 0.6, status: "HUMAN_REVIEW_REQUIRED" });
  });
  it("removes private reasoning from public review responses", () => {
    expect(redact({ critical_reviews: [{ subject: "Review", scratchpad: "private", nested: { encrypted_content: "private", evidence: "public" } }] })).toEqual({ critical_reviews: [{ subject: "Review", nested: { evidence: "public" } }] });
  });
});