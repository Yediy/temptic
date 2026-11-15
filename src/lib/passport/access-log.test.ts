import { describe, it, expect } from "vitest";
import { filterAccessLog, summarizeAccessLog, tokenStatusOf, type AccessLogRow } from "./access-log";

const row = (o: Partial<AccessLogRow>): AccessLogRow => ({
  id: Math.random().toString(), passport_id: "p", actor_id: null, actor_type: "share_token", action: "share_view",
  resource: null, ip_address: "1.2.3.4", user_agent: "Mozilla Chrome", metadata: {}, created_at: "2026-11-10T12:00:00Z", ...o,
});

describe("passport access log", () => {
  it("derives token status from action and denial reason", () => {
    expect(tokenStatusOf(row({}))).toBe("accessed");
    expect(tokenStatusOf(row({ action: "share_view_denied", metadata: { reason: "expired" } }))).toBe("denied_expired");
    expect(tokenStatusOf(row({ action: "share_view_denied", resource: "revoked", metadata: null }))).toBe("denied_revoked");
    expect(tokenStatusOf(row({ action: "share_link_revoked" }))).toBe("revoked");
  });
  it("filters by inclusive date range, IP, user-agent and status", () => {
    const rows = [row({ created_at: "2026-11-09T23:00:00" }), row({ created_at: "2026-11-10T23:30:00", ip_address: "9.9.9.9" }), row({ user_agent: "curl/8" })];
    expect(filterAccessLog(rows, { from: "2026-11-10", to: "2026-11-10" })).toHaveLength(2);
    expect(filterAccessLog(rows, { ip: "9.9" })).toHaveLength(1);
    expect(filterAccessLog(rows, { userAgent: "CURL" })).toHaveLength(1);
    expect(filterAccessLog(rows, { status: "denied_expired" })).toHaveLength(0);
  });
  it("summarizes denials and top denied IPs", () => {
    const s = summarizeAccessLog([row({}), row({ action: "share_view_denied", metadata: { reason: "revoked" }, ip_address: "5.5.5.5" }), row({ action: "share_view_denied", metadata: { reason: "expired" }, ip_address: "5.5.5.5" })]);
    expect(s.total).toBe(3);
    expect(s.denied).toBe(2);
    expect(s.topDeniedIps).toEqual([{ key: "5.5.5.5", count: 2 }]);
    expect(s.uniqueIps).toBe(2);
  });
});
