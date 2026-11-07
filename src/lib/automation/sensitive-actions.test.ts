import { describe, it, expect } from "vitest";
import { canApprove, isSensitiveAction } from "./sensitive-actions";

describe("sensitive automation actions", () => {
  it("treats drug test, payroll and escalation as sensitive", () => {
    expect(isSensitiveAction("launch_drug_test")).toBe(true);
    expect(isSensitiveAction("generate_payroll")).toBe(true);
    expect(isSensitiveAction("escalate_issue")).toBe(true);
    expect(isSensitiveAction("notify")).toBe(false);
  });
  it("only compliance/admins approve drug tests", () => {
    expect(canApprove("launch_drug_test", ["compliance_specialist"])).toBe(true);
    expect(canApprove("launch_drug_test", ["payroll"])).toBe(false);
  });
  it("only payroll/admins approve payroll", () => {
    expect(canApprove("generate_payroll", ["payroll"])).toBe(true);
    expect(canApprove("generate_payroll", ["dispatcher"])).toBe(false);
  });
  it("dispatchers can approve escalations but viewers cannot", () => {
    expect(canApprove("escalate_issue", ["dispatcher"])).toBe(true);
    expect(canApprove("escalate_issue", ["viewer"])).toBe(false);
  });
  it("super admin approves anything", () => {
    expect(canApprove("generate_payroll", ["super_admin"])).toBe(true);
  });
});
