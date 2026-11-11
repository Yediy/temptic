import { describe, it, expect } from "vitest";
import { freshnessOf, freshnessRange, searchFilter } from "./observation-stream";

const now = Date.parse("2026-11-11T12:00:00Z");
describe("observation stream", () => {
  it("freshness thresholds", () => {
    expect(freshnessOf("2026-11-11T11:30:00Z", now)).toBe("CURRENT");
    expect(freshnessOf("2026-11-11T02:00:00Z", now)).toBe("AGING");
    expect(freshnessOf("2026-11-08T12:00:00Z", now)).toBe("STALE");
    expect(freshnessOf("2026-10-01T12:00:00Z", now)).toBe("EXPIRED");
  });
  it("freshness range bounds", () => {
    expect(freshnessRange("CURRENT", now)).toEqual({ from: "2026-11-11T11:00:00.000Z", to: undefined });
    expect(freshnessRange("EXPIRED", now)).toEqual({ from: undefined, to: "2026-11-04T12:00:00.000Z" });
  });
  it("search escapes filter grammar", () => {
    expect(searchFilter("  ")).toBeNull();
    expect(searchFilter("a,b)")).toBe("name.ilike.*a b*,module.ilike.*a b*,entity_type.ilike.*a b*,status.ilike.*a b*");
  });
});
