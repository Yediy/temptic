import { describe, it, expect } from "vitest";
import { countActiveRules, groupEvents, queryToLogic, ruleToFilter, sortEvents, toCsv, type ExplorerQuery } from "./explorer-query";
import type { FabricEvent } from "./events";

const rule = (field: string, op: string, value = "", key?: string) => ({ id: "r", field, op, value, key }) as never;
const U = "11111111-1111-1111-1111-111111111111";

describe("explorer query", () => {
  it("translates rules into database filters", () => {
    expect(ruleToFilter(rule("name", "contains", "pay"))).toBe('name.ilike."*pay*"');
    expect(ruleToFilter(rule("status", "in", "failed, pending"))).toBe('status.in.("failed","pending")');
    expect(ruleToFilter(rule("metadata", "eq", "cron", "source"))).toBe('metadata->>source.eq."cron"');
    expect(ruleToFilter(rule("processed_at", "empty"))).toBe("processed_at.is.null");
  });
  it("skips incomplete or unsafe rules", () => {
    expect(ruleToFilter(rule("entity_id", "eq", "not-a-uuid"))).toBeNull();
    expect(ruleToFilter(rule("metadata", "eq", "x", "a);drop"))).toBeNull();
    expect(ruleToFilter(rule("name", "contains", ""))).toBeNull();
  });
  it("escapes commas and quotes so values can't break the filter", () => {
    expect(ruleToFilter(rule("name", "eq", 'a,b"c'))).toBe('name.eq."a,b\\"c"');
  });
  it("combines any number of rules and groups with all/any", () => {
    const q: ExplorerQuery = {
      match: "any",
      groups: [
        { id: "1", match: "all", rules: [rule("module", "eq", "payroll"), rule("status", "eq", "failed")] },
        { id: "2", match: "any", rules: [rule("entity_id", "eq", U), rule("name", "starts_with", "client.")] },
      ],
    };
    expect(queryToLogic(q)).toBe(
      `and(module.eq."payroll",status.eq."failed"),or(entity_id.eq."${U}",name.ilike."client.*")`,
    );
    expect(countActiveRules(q)).toBe(4);
    expect(queryToLogic({ ...q, match: "all" })!.startsWith("and(and(")).toBe(true);
    expect(queryToLogic({ match: "all", groups: [{ id: "x", match: "all", rules: [] }] })).toBeNull();
  });
  const evs = [
    { id: "1", module: "b", status: "failed", created_at: "2026-01-01T10:00:00Z" },
    { id: "2", module: "a", status: "failed", created_at: "2026-01-02T10:00:00Z" },
    { id: "3", module: "a", status: "ok", created_at: "2026-01-01T09:00:00Z" },
  ] as unknown as FabricEvent[];
  it("sorts by multiple keys", () => {
    expect(sortEvents(evs, [{ field: "module", dir: "asc" }, { field: "created_at", dir: "desc" }]).map((e) => e.id)).toEqual(["2", "3", "1"]);
  });
  it("groups by day", () => {
    expect(groupEvents(evs, "day").map((g) => [g.key, g.items.length])).toEqual([["2026-01-01", 2], ["2026-01-02", 1]]);
  });
  it("neutralises spreadsheet formulas in CSV export", () => {
    expect(toCsv([{ name: "=HYPERLINK(1)" } as unknown as FabricEvent]).split("\n")[1]).toContain(`"'=HYPERLINK(1)"`);
  });
});
