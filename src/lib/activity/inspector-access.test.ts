import { describe, it, expect } from "vitest";
import { canSee, redact, splitMetadata, buildEventGraph } from "./inspector-access";

const evt = { id: "e1", name: "worker.created", correlation_id: "c1", entity_type: "worker", entity_id: "w123456789", related_objects: [{ type: "client", id: "k1" }] } as never;

describe("inspector access", () => {
  it("viewer cannot see payload or WOIC", () => {
    expect(canSee(["viewer"], "payload")).toBe(false);
    expect(canSee(["viewer"], "woic")).toBe(false);
    expect(canSee(["viewer"], "affected")).toBe(true);
  });
  it("payroll sees metadata but not payload", () => {
    expect(canSee(["payroll"], "metadata")).toBe(true);
    expect(canSee(["payroll"], "payload")).toBe(false);
  });
  it("dispatcher sees payload with sensitive keys masked; admin unmasked", () => {
    expect(redact({ email: "a@b.c", n: 1 }, ["dispatcher"])).toEqual({ email: "••• restricted", n: 1 });
    expect(redact({ email: "a@b.c" }, ["agency_admin"])).toEqual({ email: "a@b.c" });
  });
  it("splits processing metadata from payload", () => {
    expect(splitMetadata({ status: "x", woic: {}, attempts: 2 })).toEqual({ payload: { status: "x" }, processing: { woic: {}, attempts: 2 } });
  });
  it("graph omits affected objects when not permitted", () => {
    expect(buildEventGraph(evt, [], [], false).nodes).toHaveLength(1);
    expect(buildEventGraph(evt, [], [], true).nodes.filter((n) => n.kind === "object")).toHaveLength(2);
  });
});
