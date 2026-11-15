import { describe, it, expect } from "vitest";
import { newRecipient, planRecipientLinks, SHARE_SECTIONS } from "./share-recipients";

const r = (o: object) => ({ ...newRecipient("k"), ...o });
describe("planRecipientLinks", () => {
  it("full access shares every section read-only; limited only picked sections", () => {
    const p = planRecipientLinks([r({ name: "Acme", access: "full" }), r({ name: "Beta", sections: ["skills"] })]);
    if (!p.ok) throw new Error();
    expect(p.requests[0].scopes).toEqual([...SHARE_SECTIONS]);
    expect(p.requests[1].scopes).toEqual(["skills"]);
    expect(p.requests[1].label).toBe("Beta · limited");
  });
  it("one-time = 1 use, otherwise clamped 2..50; expiry clamped 1..720h", () => {
    const p = planRecipientLinks([r({ name: "A", oneTime: false, maxUses: 99, expiresInHours: 5000 }), r({ name: "B" })]);
    if (!p.ok) throw new Error();
    expect(p.requests[0]).toMatchObject({ max_uses: 50, expires_in_hours: 720 });
    expect(p.requests[1].max_uses).toBe(1);
  });
  it("rejects missing names, duplicates, empty sections, >20 recipients", () => {
    expect(planRecipientLinks([r({ name: "" })]).ok).toBe(false);
    expect(planRecipientLinks([r({ name: "A" }), r({ name: "a" })]).ok).toBe(false);
    expect(planRecipientLinks([r({ name: "A", sections: [] })]).ok).toBe(false);
    expect(planRecipientLinks(Array.from({ length: 21 }, (_, i) => r({ name: `N${i}` }))).ok).toBe(false);
  });
});
