import { describe, expect, it, vi, beforeEach } from "vitest";
const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: mocks }));
import { readAgencyScreening } from "./read-document";

describe("agency screening document access", () => {
  beforeEach(() => vi.resetAllMocks());
  function setup() {
    const q = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data: { id: "report-1", document_version: 3, summary: "Recorded result" }, error: null }) };
    q.select.mockReturnValue(q); q.eq.mockReturnValue(q); mocks.from.mockReturnValue(q);
    mocks.rpc.mockResolvedValue({ error: null });
    return q;
  }
  it("scopes report reads to the agency and logs the opened document", async () => {
    const q = setup();
    const result = await readAgencyScreening("report", "report-1", "agency-a");
    expect(q.eq).toHaveBeenCalledWith("screening_orders.agency_id", "agency-a");
    expect(q.eq).toHaveBeenCalledWith("id", "report-1");
    expect(mocks.rpc).toHaveBeenCalledWith("log_screening_access", { _record_type: "report", _record_ids: ["report-1"], _context: "compliance document review" });
    expect(result[0].document_version).toBe(3);
  });
  it("withholds content if its access cannot be audited", async () => {
    setup(); mocks.rpc.mockResolvedValue({ error: { message: "denied" } });
    await expect(readAgencyScreening("report", "report-1", "agency-a")).rejects.toThrow("has not been displayed");
  });
});