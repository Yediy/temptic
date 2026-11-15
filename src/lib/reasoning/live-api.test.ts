import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ from: vi.fn(), calls: [] as { table: string; filters: [string, unknown][] }[] }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
import { readLiveReasoning } from "./live-api";

describe("live reasoning API scoping", () => {
  beforeEach(() => {
    mocks.calls.length = 0;
    mocks.from.mockImplementation((table: string) => {
      const call = { table, filters: [] as [string, unknown][] };
      mocks.calls.push(call);
      const builder = {
        select: () => builder, order: () => builder,
        eq: (key: string, value: unknown) => { call.filters.push([key, value]); return builder; },
        range: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      return builder;
    });
  });
  it("scopes every request and trace read to the current organization", async () => {
    await readLiveReasoning("agency-a", "reasoning.requests.list");
    expect(mocks.calls).toHaveLength(2);
    for (const call of mocks.calls) expect(call.filters).toContainEqual(["agency_id", "agency-a"]);
    expect(mocks.calls[0].filters).toContainEqual(["service", "reasoning"]);
  });
  it("scopes detail lookups by organization as well as ID", async () => {
    await expect(readLiveReasoning("agency-a", "reasoning.conclusions.get", { conclusion_id: "trace-b" })).rejects.toThrow("not found");
    const traces = mocks.calls.find(c => c.table === "woic_reasoning_traces");
    expect(traces?.filters).toContainEqual(["agency_id", "agency-a"]);
    expect(traces?.filters).toContainEqual(["id", "trace-b"]);
  });
});