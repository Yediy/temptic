import { describe, it, expect } from "vitest";
import { canAccessPbPage } from "./permissions";

describe("PB page access", () => {
  it("viewer can open the dashboard but not payroll runs", () => {
    expect(canAccessPbPage("/pb", ["viewer"])).toBe(true);
    expect(canAccessPbPage("/pb/payroll", ["viewer"])).toBe(false);
  });
  it("dispatcher cannot record payments", () => {
    expect(canAccessPbPage("/pb/payments", ["dispatcher"])).toBe(false);
  });
  it("payroll can open invoices but not integrations", () => {
    expect(canAccessPbPage("/pb/invoices", ["payroll"])).toBe(true);
    expect(canAccessPbPage("/pb/integrations", ["payroll"])).toBe(false);
  });
  it("agency admin can open integrations", () => {
    expect(canAccessPbPage("/pb/integrations", ["agency_admin"])).toBe(true);
  });
  it("unknown pages are denied", () => {
    expect(canAccessPbPage("/pb/secret", ["super_admin"])).toBe(false);
  });
});
