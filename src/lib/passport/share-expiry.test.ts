import { describe, it, expect } from "vitest";
import { pendingExpiries } from "./share-expiry";
const now = Date.parse("2026-11-15T12:00:00Z");
const base = { revoked_at: null, used_count: 0, max_uses: 1 };
describe("pendingExpiries", () => {
  it("schedules only active links expiring in the future within 24h", () => {
    const r = pendingExpiries([
      { ...base, id: "a", expires_at: "2026-11-15T12:10:00Z" },
      { ...base, id: "past", expires_at: "2026-11-15T11:00:00Z" },
      { ...base, id: "far", expires_at: "2026-11-20T12:00:00Z" },
      { ...base, id: "rev", expires_at: "2026-11-15T12:10:00Z", revoked_at: "x" },
      { ...base, id: "used", expires_at: "2026-11-15T12:10:00Z", used_count: 1 },
    ], now);
    expect(r).toEqual([{ id: "a", delay: 600_000 }]);
  });
});
