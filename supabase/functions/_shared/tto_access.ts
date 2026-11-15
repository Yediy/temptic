// Time-ticket access helpers: tenant membership + role checks for tto-* functions.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const TTO_STAFF = ["super_admin", "agency_owner", "agency_admin", "dispatcher", "scheduler", "account_manager"];
export const TTO_PAYROLL = ["super_admin", "agency_owner", "agency_admin", "payroll", "payroll_specialist"];
export const TTO_BILLING = ["super_admin", "agency_owner", "agency_admin", "payroll", "billing_specialist"];

/** Roles the user holds in the agency (active membership) plus global super_admin. */
export async function agencyRoles(admin: SupabaseClient, userId: string, agencyId: string): Promise<string[]> {
  if (!UUID_RE.test(agencyId)) return [];
  const [{ data: g }, { data: m }] = await Promise.all([
    admin.from("user_roles").select("role").eq("user_id", userId),
    admin.from("agency_members").select("role, is_active").eq("user_id", userId).eq("agency_id", agencyId),
  ]);
  const roles = new Set<string>();
  for (const r of g ?? []) if (r.role === "super_admin") roles.add("super_admin");
  for (const r of m ?? []) if (r.is_active !== false && r.role) roles.add(String(r.role));
  return [...roles];
}

export async function hasAgencyRole(admin: SupabaseClient, userId: string, agencyId: string, allowed: string[]) {
  const roles = await agencyRoles(admin, userId, agencyId);
  return roles.some((r) => allowed.includes(r));
}

export async function isAnyAgencyMember(admin: SupabaseClient, userId: string, agencyId: string) {
  return (await agencyRoles(admin, userId, agencyId)).length > 0;
}

export async function isAssignedWorker(admin: SupabaseClient, userId: string, workerId: string | null) {
  if (!workerId) return false;
  const { data } = await admin.from("workers").select("user_id").eq("id", workerId).maybeSingle();
  return !!data && data.user_id === userId;
}

/** Agencies where the user holds one of the allowed roles (super_admin => null meaning all). */
export async function agenciesWithRole(admin: SupabaseClient, userId: string, allowed: string[]): Promise<string[] | null> {
  const { data: g } = await admin.from("user_roles").select("role").eq("user_id", userId);
  if ((g ?? []).some((r) => r.role === "super_admin")) return null;
  const { data: m } = await admin.from("agency_members").select("agency_id, role, is_active").eq("user_id", userId);
  return [...new Set((m ?? []).filter((r) => r.is_active !== false && allowed.includes(String(r.role))).map((r) => r.agency_id as string))];
}
