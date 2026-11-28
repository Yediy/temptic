import { describe, it, expect } from "vitest";
import { billRateFromMarkup, buildContractInvoices } from "../../../supabase/functions/_shared/contract-invoice";
const terms = (bill: number | null, currency = "USD") => ({ contract_id: "c", assignment_id: "a", contract_reference: "Framing", pay_rate: 40, bill_rate: bill, currency, worker_name: "Bill Nue", worker_code: null, client_name: "Acme" });
const ticket = (id: string, reg = 8, ot = 0) => ({ id, client_id: "acme", worker_id: "w", work_date: "2026-11-27", regular_hours: reg, overtime_hours: ot, double_time_hours: 0 });
describe("client invoices from contract terms", () => {
  it("$40 pay with 50% markup bills $60/hour", () => expect(billRateFromMarkup(40, 50)).toBe(60));
  it("bills 8 regular + 2 overtime hours at $60 = $660, markup $220", () => {
    const { invoices } = buildContractInvoices([ticket("t1", 8, 2)], new Map([["t1", terms(60)]]), new Set());
    expect(invoices[0].subtotal).toBe(660);
    expect(invoices[0].items.reduce((s, i) => s + Number(i.markup), 0)).toBe(220);
  });
  it("never invoices the same ticket twice", () => {
    const r = buildContractInvoices([ticket("t1")], new Map([["t1", terms(60)]]), new Set(["t1"]));
    expect(r.invoices).toHaveLength(0); expect(r.skipped[0].reason).toBe("already_invoiced");
  });
  it("skips tickets without an agreed bill rate", () => {
    expect(buildContractInvoices([ticket("t1")], new Map([["t1", terms(null)]]), new Set()).invoices).toHaveLength(0);
  });
  it("splits invoices by currency", () => {
    const r = buildContractInvoices([ticket("t1"), ticket("t2")], new Map([["t1", terms(60)], ["t2", terms(60, "CAD")]]), new Set());
    expect(r.invoices).toHaveLength(2);
  });
});