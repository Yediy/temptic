import { describe, it, expect } from "vitest";
import { analyzeConflicts, conditionsDisjoint } from "./conflicts";

const r = (id: string, trigger: string, actions: unknown[], extra: Record<string, unknown> = {}) =>
  ({ id, name: id, trigger_event: trigger, actions, priority: 100, ...extra });

describe("automation conflict detection", () => {
  it("flags duplicate actions and names the priority winner", () => {
    const f = analyzeConflicts([
      r("A", "shift.completed", [{ type: "notify", title: "Done" }], { priority: 10 }),
      r("B", "shift.completed", [{ type: "notify", title: "Done" }], { priority: 50 }),
    ]);
    const d = f.find((x) => x.kind === "duplicate")!;
    expect(d.resolution).toContain('"A"');
  });
  it("flags contradictory outcomes as errors", () => {
    const f = analyzeConflicts([
      r("A", "ticket.submitted", [{ type: "emit_event", name: "ticket.approved" }], { priority: 1 }),
      r("B", "ticket.submitted", [{ type: "emit_event", name: "ticket.rejected" }], { priority: 2 }),
    ]);
    expect(f.find((x) => x.kind === "contradiction")?.level).toBe("error");
  });
  it("flags equal-priority overlap as a race", () => {
    const f = analyzeConflicts([r("A", "x", [{ type: "notify", title: "1" }]), r("B", "x", [{ type: "create_task", title: "2" }])]);
    expect(f.some((x) => x.kind === "race")).toBe(true);
  });
  it("ignores rules whose conditions cannot both match", () => {
    expect(conditionsDisjoint([{ field: "payload.status", operator: "eq", value: "a" }], [{ field: "payload.status", operator: "eq", value: "b" }])).toBe(true);
    const f = analyzeConflicts([
      r("A", "x", [{ type: "emit_event", name: "t.approved" }], { conditions: [{ field: "payload.status", operator: "eq", value: "a" }] }),
      r("B", "x", [{ type: "emit_event", name: "t.rejected" }], { conditions: [{ field: "payload.status", operator: "eq", value: "b" }] }),
    ]);
    expect(f).toHaveLength(0);
  });
  it("detects loops", () => {
    const f = analyzeConflicts([
      r("A", "a.go", [{ type: "emit_event", name: "b.go" }]),
      r("B", "b.go", [{ type: "emit_event", name: "a.go" }], { priority: 5 }),
    ]);
    expect(f.some((x) => x.kind === "loop")).toBe(true);
  });
});
