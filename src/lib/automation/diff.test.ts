import { describe, it, expect } from "vitest";
import { diffSnapshots, canRollbackTo } from "./diff";

describe("automation version diff", () => {
  it("reports only changed fields", () => {
    const d = diffSnapshots({ name: "A", priority: 100, actions: [{ t: "x" }] }, { name: "B", priority: 100, actions: [{ t: "x" }] });
    expect(d).toEqual([{ field: "name", before: "A", after: "B" }]);
  });
  it("ignores key order inside objects", () => {
    expect(diffSnapshots({ conditions: { a: 1, b: 2 } }, { conditions: { b: 2, a: 1 } })).toEqual([]);
  });
  it("treats first version as all-new fields", () => {
    expect(diffSnapshots(null, { name: "A" })).toEqual([{ field: "name", before: null, after: "A" }]);
  });
});

describe("rollback rules", () => {
  it("only allows rolling back to an earlier version", () => {
    expect(canRollbackTo({ version: 2, change_kind: "update" }, 3)).toBe(true);
    expect(canRollbackTo({ version: 3, change_kind: "update" }, 3)).toBe(false);
    expect(canRollbackTo({ version: 4, change_kind: "update" }, 3)).toBe(false);
  });
  it("never restores a delete entry or a deleted rule", () => {
    expect(canRollbackTo({ version: 2, change_kind: "delete" }, 3)).toBe(false);
    expect(canRollbackTo({ version: 1, change_kind: "create" }, null)).toBe(false);
  });
});
