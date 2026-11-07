import { describe, it, expect } from "vitest";
import { simulateRule, evaluateConditions } from "./simulate";

const ctx = { event: { name: "shift.completed" }, payload: { status: "completed", hours: 12 }, actor: { id: "u1" } };

describe("workflow simulation", () => {
  it("does not run when the trigger differs", () => {
    const r = simulateRule({ trigger_event: "shift.cancelled", actions: [{ type: "notify" }] }, ctx);
    expect(r.triggerMatched).toBe(false);
    expect(r.actions).toHaveLength(0);
  });
  it("reports each condition with actual value", () => {
    const { results, passed } = evaluateConditions([{ field: "payload.hours", operator: "gt", value: 10 }], ctx);
    expect(passed).toBe(true);
    expect(results[0].actual).toBe(12);
  });
  it("skips actions when a condition fails", () => {
    const r = simulateRule({ trigger_event: "shift.completed", conditions: [{ field: "payload.hours", operator: "lt", value: 8 }], actions: [{ type: "notify" }] }, ctx);
    expect(r.willRun).toBe(false);
    expect(r.actions).toHaveLength(0);
  });
  it("supports or joiner", () => {
    const { passed } = evaluateConditions([
      { field: "payload.hours", operator: "lt", value: 8 },
      { field: "payload.status", operator: "eq", value: "completed", joiner: "or" },
    ], ctx);
    expect(passed).toBe(true);
  });
  it("sensitive actions are shown as awaiting approval, not executed", () => {
    const r = simulateRule({ trigger_event: "*", actions: [{ type: "generate_payroll" }] }, ctx);
    expect(r.actions[0].outcome).toBe("await_approval");
  });
  it("lists emitted events and the rules they would cascade into", () => {
    const r = simulateRule(
      { id: "a", trigger_event: "shift.completed", actions: [{ type: "emit_event", name: "ot.flagged" }] },
      ctx,
      [{ id: "b", name: "OT follow-up", trigger_event: "ot.flagged" }],
    );
    expect(r.resultingEvents[0].name).toBe("ot.flagged");
    expect(r.cascades[0].rules).toEqual(["OT follow-up"]);
  });
});
