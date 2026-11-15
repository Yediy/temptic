// Summaries + filters for passport_access_log (read is RLS-scoped: owners see their own, super_admin sees all).
export interface AccessLogRow {
  id: string; passport_id: string; actor_id: string | null; actor_type: string; action: string;
  resource: string | null; ip_address: string | null; user_agent: string | null;
  metadata: Record<string, unknown> | null; created_at: string;
}

export type TokenStatus = "created" | "accessed" | "denied_revoked" | "denied_expired" | "denied_exhausted" | "denied_other" | "revoked" | "other";
export const TOKEN_STATUS_LABEL: Record<TokenStatus, string> = {
  created: "Link created", accessed: "Opened", denied_revoked: "Denied · revoked", denied_expired: "Denied · expired",
  denied_exhausted: "Denied · used up", denied_other: "Denied · other", revoked: "Revoked by owner", other: "Other access",
};

export function tokenStatusOf(r: Pick<AccessLogRow, "action" | "resource" | "metadata">): TokenStatus {
  switch (r.action) {
    case "share_link_created": return "created";
    case "share_view": return "accessed";
    case "share_link_revoked": return "revoked";
    case "share_view_denied": {
      const why = String((r.metadata?.reason as string) ?? r.resource ?? "");
      if (why === "revoked") return "denied_revoked";
      if (why === "expired") return "denied_expired";
      if (why === "exhausted") return "denied_exhausted";
      return "denied_other";
    }
    default: return "other";
  }
}

export interface AccessLogFilters { from?: string; to?: string; ip?: string; userAgent?: string; status?: TokenStatus | "" }

export function filterAccessLog(rows: AccessLogRow[], f: AccessLogFilters): AccessLogRow[] {
  const ip = f.ip?.trim().toLowerCase(), ua = f.userAgent?.trim().toLowerCase();
  const from = f.from ? Date.parse(`${f.from}T00:00:00`) : null;
  const to = f.to ? Date.parse(`${f.to}T23:59:59.999`) : null;
  return rows.filter((r) => {
    const t = Date.parse(r.created_at);
    if (from !== null && t < from) return false;
    if (to !== null && t > to) return false;
    if (ip && !(r.ip_address ?? "").toLowerCase().includes(ip)) return false;
    if (ua && !(r.user_agent ?? "").toLowerCase().includes(ua)) return false;
    if (f.status && tokenStatusOf(r) !== f.status) return false;
    return true;
  });
}

const top = (m: Map<string, number>, n = 5) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([key, count]) => ({ key, count }));

export function summarizeAccessLog(rows: AccessLogRow[]) {
  const byStatus = {} as Record<TokenStatus, number>;
  const ips = new Map<string, number>(), uas = new Map<string, number>(), deniedIps = new Map<string, number>();
  for (const r of rows) {
    const s = tokenStatusOf(r);
    byStatus[s] = (byStatus[s] ?? 0) + 1;
    if (r.ip_address) {
      ips.set(r.ip_address, (ips.get(r.ip_address) ?? 0) + 1);
      if (s.startsWith("denied")) deniedIps.set(r.ip_address, (deniedIps.get(r.ip_address) ?? 0) + 1);
    }
    if (r.user_agent) uas.set(r.user_agent, (uas.get(r.user_agent) ?? 0) + 1);
  }
  const denied = Object.entries(byStatus).filter(([k]) => k.startsWith("denied")).reduce((a, [, v]) => a + v, 0);
  return {
    total: rows.length, byStatus, denied, uniqueIps: ips.size,
    topIps: top(ips), topUserAgents: top(uas), topDeniedIps: top(deniedIps),
  };
}
