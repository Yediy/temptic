// Write-capable passport functions: only the passport's own worker or staff of the
// worker's agency may trigger recomputes. Shared/granted readers are read-only.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

const MANAGE_ROLES = ["agency_owner", "agency_admin", "recruiter", "account_manager", "onboarding_specialist", "compliance_specialist", "dispatcher", "scheduler"];

export async function canManagePassport(admin: SupabaseClient, userId: string, passportId: string): Promise<boolean> {
  const { data: p } = await admin.from("workforce_passports").select("worker_id").eq("id", passportId).maybeSingle();
  if (!p?.worker_id) return false;
  const { data: w } = await admin.from("workers").select("user_id, agency_id").eq("id", p.worker_id).maybeSingle();
  if (!w) return false;
  if (w.user_id && w.user_id === userId) return true;
  const [{ data: g }, { data: m }] = await Promise.all([
    admin.from("user_roles").select("role").eq("user_id", userId),
    w.agency_id
      ? admin.from("agency_members").select("role, is_active").eq("user_id", userId).eq("agency_id", w.agency_id)
      : Promise.resolve({ data: [] as Array<{ role: string; is_active: boolean }> }),
  ]);
  if ((g ?? []).some((r) => r.role === "super_admin")) return true;
  return (m ?? []).some((r) => r.is_active !== false && MANAGE_ROLES.includes(String(r.role)));
}
