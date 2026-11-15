import { describe, it, expect } from "vitest";
import { buildPrivacyView, buildProvenance, classifyKey, privacyTier, scanMarkers, scopeValue } from "./privacy";

describe("privacy", () => {
  it("classifies keys", () => {
    expect(classifyKey("chain_of_thought")).toBe("restricted");
    expect(classifyKey("worker_email")).toBe("sensitive");
    expect(classifyKey("user_agent")).toBe("internal");
    expect(classifyKey("site_name")).toBe("general");
  });
  it("tiers", () => {
    expect(privacyTier(["viewer"])).toBe("staff");
    expect(privacyTier(["agency_admin"])).toBe("admin");
    expect(privacyTier(["super_admin", "viewer"])).toBe("super");
    expect(privacyTier(["worker_user"])).toBe("none");
  });
  it("staff never sees markers or tenant rules; admin sees own rules without role lists", () => {
    const s = buildPrivacyView(["dispatcher"], "a1", [{ email: "x" }]);
    expect(s.markers).toBeNull();
    expect(s.tenantScope).toBeNull();
    const a = buildPrivacyView(["agency_admin"], "a1", [{ items: [{ email: "x" }, { email: "y" }] }]);
    expect(a.markers).toEqual([{ path: "items[].email", cls: "sensitive" }]);
    expect(a.tenantScope?.agencyId).toBe("a1");
    expect(a.tenantScope?.rules[0].readRoles).toBeUndefined();
    expect(a.moduleScopes).toBeNull();
    expect(buildPrivacyView(["super_admin"], "a1", []).moduleScopes).not.toBeNull();
  });
  it("markers never include restricted values or descend into them", () => {
    expect(scanMarkers({ cot: { email: "x" } })).toEqual([{ path: "cot", cls: "restricted" }]);
  });
  it("restricted contents are excluded for every tier, sensitive hidden for staff", () => {
    expect(scopeValue({ cot: "secret", email: "e", n: 1 }, "super")).toEqual({ cot: "[restricted — excluded]", email: "e", n: 1 });
    expect(scopeValue({ email: "e" }, "staff")).toEqual({ email: "[sensitive — hidden for your role]" });
  });
  it("provenance traces origin and counts withheld fields", () => {
    const p = buildProvenance({ source: "gps", ref_id: "x1", email: "e", claim: "off site" }, { requestId: "r1", traceId: "t1", operation: "reason" }, "staff");
    expect(p.chain.find((c) => c.label === "Origin source")?.value).toBe("gps");
    expect(p.chain.find((c) => c.label === "Cognitive request")?.value).toBe("reason · r1");
    expect(p.withheld).toBe(1);
  });
});
