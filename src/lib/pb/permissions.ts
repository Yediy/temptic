// Payroll & Billing page access matrix. Server actions are enforced
// separately in supabase/functions/_shared/pb_access.ts (keep in sync).
const FULL = ["super_admin", "agency_admin", "payroll"];
const READ = [...FULL, "dispatcher", "viewer"];

export const PB_PAGE_ROLES: Record<string, string[]> = {
  "/pb": READ,
  "/pb/payroll": FULL,
  "/pb/exceptions": FULL,
  "/pb/invoices": FULL,
  "/pb/payments": FULL,
  "/pb/rates": FULL,
  "/pb/commissions": FULL,
  "/pb/margin": READ,
  "/pb/forecast": READ,
  "/pb/executive": READ,
  "/pb/analytics": READ,
  "/pb/compliance": FULL,
  "/pb/integrations": ["super_admin", "agency_admin"],
};

export function canAccessPbPage(path: string, roles: readonly string[]): boolean {
  const clean = path.replace(/\/+$/, "") || "/pb";
  const allowed = PB_PAGE_ROLES[clean];
  if (!allowed) return false;
  return roles.some((r) => allowed.includes(r));
}
