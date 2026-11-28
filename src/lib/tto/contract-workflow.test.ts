import { describe, expect, it } from "vitest";
import { contractSchema, withinEffectiveDates, oneYearEndDate, workedTimestamp } from "./contract-validation";
import { agreedRate, hourlyAmounts, type ContractTerms } from "../../../supabase/functions/_shared/contract-rates";
import { buildContractExport } from "../../../supabase/functions/_shared/contract-export";

const terms: ContractTerms = { contract_id: "contract-1", assignment_id: "assignment-1", contract_reference: "Test contract", pay_rate: 40, bill_rate: null, currency: "USD", worker_name: "Test worker", worker_code: "T01", client_name: "Test client" };
describe("contracted pay for time tickets", () => {
  it("uses an inclusive one-year term rather than one year of payroll hours", () => {
    expect(oneYearEndDate("2026-11-27")).toBe("2027-11-26");
  });
  it("records Eastern work times correctly through daylight-saving changes", () => {
    expect(workedTimestamp("2026-11-27T08:00", "America/New_York")).toBe("2026-11-27T13:00:00.000Z");
    expect(workedTimestamp("2026-07-01T08:00", "America/New_York")).toBe("2026-07-01T12:00:00.000Z");
  });
  it("uses the user's agreed $40 hourly pay", () => {
    expect(agreedRate(terms, "payroll")).toEqual({ amount: 40, currency: "USD" });
    expect(hourlyAmounts(8, 0, 0, agreedRate(terms, "payroll").amount)[0]).toBe(320);
  });
  it("Generate export includes the ticket, contract, assignment and its $40 pay in the CSV", () => {
    const result = buildContractExport("payroll", [{ id: "ticket-1", work_date: "2026-11-28", regular_hours: 8, overtime_hours: 0, double_time_hours: 0 }], new Map([["ticket-1", terms]]), new Map());
    expect(result.csv.split("\n")[1]).toBe("2026-11-28,T01,Test worker,Test client,ticket-1,8,0,0,40,320,0,0,0,0,320,USD,contract-1,assignment-1,Test contract,0,320,320");
    expect(result.totals.grand_total).toBe(320);
  });
  it("blocks mixed-currency payroll totals", () => {
    const ticket = { id: "ticket-1", work_date: "2026-11-28", regular_hours: 8, overtime_hours: 0, double_time_hours: 0 };
    expect(() => buildContractExport("payroll", [ticket, { ...ticket, id: "ticket-2" }], new Map([["ticket-1", terms], ["ticket-2", { ...terms, currency: "CAD" }]]), new Map())).toThrow("mixes currencies");
  });
  it("does not replace missing contract pay with a zero-dollar fallback", () => {
    expect(() => agreedRate(undefined, "payroll")).toThrow("contracted assignment");
    expect(() => agreedRate({ ...terms, pay_rate: 0 }, "payroll")).toThrow("positive agreed pay");
  });
  it("requires a real contracted assignment", () => {
    expect(() => agreedRate({ ...terms, assignment_id: "" }, "payroll")).toThrow("contracted assignment");
  });
  it("preserves the contract currency", () => {
    expect(agreedRate({ ...terms, currency: "CAD" }, "payroll").currency).toBe("CAD");
  });
  it("requires an agreed bill rate rather than inventing markup", () => {
    expect(() => agreedRate(terms, "billing")).toThrow("agreed bill");
    expect(agreedRate({ ...terms, bill_rate: 55 }, "billing").amount).toBe(55);
  });
  it("honors inclusive effective-date bounds", () => {
    expect(withinEffectiveDates("2026-11-28", "2026-11-28", "2026-11-30")).toBe(true);
    expect(withinEffectiveDates("2026-11-27", "2026-11-28", "2026-11-30")).toBe(false);
    expect(withinEffectiveDates("2026-12-01", "2026-11-28", "2026-11-30")).toBe(false);
  });
  it("retains the existing 1.5x overtime and 2x double-time calculations", () => {
    expect(hourlyAmounts(0, 1, 1, 40)).toEqual([0, 60, 80]);
  });
  it("rejects invalid contract dates and non-positive pay", () => {
    const valid = { reference: "Fixture", client_id: "00000000-0000-4000-8000-000000000001", site_id: null, supervisor_id: "00000000-0000-4000-8000-000000000002", work_details: "Fixture work", pay_rate: 40, bill_rate: null, currency: "USD", starts_on: "2026-11-28", ends_on: "2026-11-30" };
    expect(contractSchema.parse(valid).pay_rate).toBe(40);
    expect(contractSchema.safeParse({ ...valid, ends_on: "2026-11-27" }).success).toBe(false);
    expect(contractSchema.safeParse({ ...valid, pay_rate: -40 }).success).toBe(false);
  });
});