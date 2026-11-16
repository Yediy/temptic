import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: mocks }));
import { readComplianceScreening, OPEN_COMPLIANCE_STATUSES } from "./compliance-report";

describe("compliance report reads", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.rpc.mockResolvedValue({ error: null }); });
  function query(data: unknown[]) {
    const q = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn().mockResolvedValue({ data, error: null }) };
    q.select.mockReturnValue(q); q.eq.mockReturnValue(q); q.order.mockReturnValue(q);
    return q;
  }
  it("scopes every screening source to the agency and audits every displayed record type", async () => {
    const orders = query([{ id: "o1", worker_id: "w1", status: "completed", provider: "mock", created_at: "2026-11-16" }]);
    const reports = query([{ id: "r1", result: "clear", document_version: 3, screening_orders: { worker_id: "w1", provider: "mock" } }]);
    const consents = query([{ id: "c1", worker_id: "w1", document_version: 2, signed_at: null, screening_orders: { provider: "mock" } }]);
    mocks.from.mockReturnValueOnce(orders).mockReturnValueOnce(reports).mockReturnValueOnce(consents);
    const rows = await readComplianceScreening("agency-a", 0);
    expect(orders.eq).toHaveBeenCalledWith("agency_id", "agency-a");
    expect(reports.eq).toHaveBeenCalledWith("screening_orders.agency_id", "agency-a");
    expect(consents.eq).toHaveBeenCalledWith("screening_orders.agency_id", "agency-a");
    for (const [type, id] of [["order", "o1"], ["report", "r1"], ["consent", "c1"]]) expect(mocks.rpc).toHaveBeenCalledWith("log_screening_access", { _record_type: type, _record_ids: [id], _context: "compliance report" });
    expect(rows.find(r => r.id === "r1")?.version).toBe(3);
  });
  it("withholds screening records when audit recording fails", async () => {
    mocks.from.mockReturnValue(query([{ id: "o1" }]));
    mocks.rpc.mockResolvedValue({ error: { message: "denied" } });
    await expect(readComplianceScreening("agency-a", 0)).rejects.toThrow("Records have not been displayed");
  });
  it("includes pending and actionable findings, not resolved or healthy records", () => {
    expect(OPEN_COMPLIANCE_STATUSES).toEqual(["open", "pending", "warning", "expired"]);
    expect(OPEN_COMPLIANCE_STATUSES).not.toContain("resolved");
    expect(OPEN_COMPLIANCE_STATUSES).not.toContain("ok");
  });
});