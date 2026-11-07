import { describe, it, expect } from "vitest";
import { extractCorrelationId, filterAuditRows, fromDecision, fromRequest } from "./audit-trail";

describe("WOIC audit trail", () => {
  it("reads correlation id from metadata, else falls back to record id", () => {
    expect(extractCorrelationId("x", { metadata: { correlation_id: "c-1" } })).toBe("c-1");
    expect(extractCorrelationId("x", {})).toBe("x");
  });
  const rows = [
    fromRequest({ id: "r1", agency_id: "A", service: "cognitive", operation: "reason", input: { correlation_id: "corr-9" }, created_at: "2026-01-02" }),
    fromDecision({ id: "d1", agency_id: "B", source: { engine: "woic-ticket-review" }, created_at: "2026-01-03" }),
  ];
  it("filters by organization exactly", () => {
    expect(filterAuditRows(rows, { organizationId: "B" }).map((r) => r.id)).toEqual(["d1"]);
  });
  it("filters by correlation id", () => {
    expect(filterAuditRows(rows, { correlationId: "corr-9" }).map((r) => r.id)).toEqual(["r1"]);
  });
  it("filters by event source", () => {
    expect(filterAuditRows(rows, { source: "ticket-review" }).map((r) => r.id)).toEqual(["d1"]);
  });
});
