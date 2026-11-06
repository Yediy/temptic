// Payroll & Billing access guard: verifies the caller belongs to the target
// agency with an allowed role, and writes every decision to pb_audit_events.
// Keep the role matrix in sync with src/lib/pb/permissions.ts.
import type { SupabaseClient, User } from "npm:@supabase/supabase-js@2";
import { jsonResponse } from "./auth.ts";

export const PB_ACTION_ROLES: Record<string, string[]> = {
  "payroll.generate": ["super_admin", "agency_admin", "payroll", "payroll_specialist"],
  "payroll.compliance_scan": ["super_admin", "agency_admin", "payroll", "payroll_specialist", "compliance_specialist"],
  "invoice.generate": ["super_admin", "agency_admin", "payroll", "billing_specialist"],
  "payment.record": ["super_admin", "agency_admin", "payroll", "billing_specialist"],
  "commission.compute": ["super_admin", "agency_admin", "payroll"],
  "forecast.generate": ["super_admin", "agency_admin", "payroll"],
};

interface GuardArgs {
  admin: SupabaseClient;
  req: Request;
  user: User;
  functionName: string;
  action: keyof typeof PB_ACTION_ROLES | string;
  agencyId: string | null;
  subjectType?: string;
  subjectId?: string | null;
  corsHeaders: Record<string, string>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function pbAudit(
  admin: SupabaseClient,
  req: Request,
  row: {
    agency_id: string | null; actor_id: string | null; actor_roles?: string[];
    function_name: string; action: string; decision: "allowed" | "denied" | "error";
    reason?: string | null; subject_type?: string | null; subject_id?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  try {
    await admin.from("pb_audit_events").insert({
      ...row,
      actor_roles: row.actor_roles ?? [],
      metadata: row.metadata ?? {},
      ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      user_agent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
    });
  } catch (e) {
    console.error("pb audit insert failed", e);
  }
}

/** Returns caller roles when allowed, or a 400/403 Response (already audited). */
export async function requirePbAccess(a: GuardArgs): Promise<{ roles: string[] } | Response> {
  const allowed = PB_ACTION_ROLES[a.action] ?? [];
  const base = {
    actor_id: a.user.id, function_name: a.functionName, action: a.action,
    subject_type: a.subjectType ?? null,
    subject_id: a.subjectId && UUID_RE.test(a.subjectId) ? a.subjectId : null,
  };

  if (!a.agencyId || !UUID_RE.test(a.agencyId)) {
    await pbAudit(a.admin, a.req, { ...base, agency_id: null, decision: "denied", reason: "invalid_agency_id" });
    return jsonResponse({ error: "Valid agency_id required", code: "bad_request" }, 400, a.corsHeaders);
  }

  const [{ data: globalRoles }, { data: membership }] = await Promise.all([
    a.admin.from("user_roles").select("role").eq("user_id", a.user.id),
    a.admin.from("agency_members").select("role, is_active")
      .eq("user_id", a.user.id).eq("agency_id", a.agencyId).maybeSingle(),
  ]);
  const roleSet = new Set<string>((globalRoles ?? []).map((r: { role: string }) => String(r.role)));
  const isSuper = roleSet.has("super_admin");
  const isMember = !!membership && membership.is_active !== false;
  if (isMember && membership?.role) roleSet.add(String(membership.role));
  const roles = [...roleSet];

  let reason: string | null = null;
  if (!isSuper && !isMember) reason = "not_agency_member";
  else if (!roles.some((r) => allowed.includes(r))) reason = "role_not_permitted";

  if (reason) {
    await pbAudit(a.admin, a.req, { ...base, agency_id: a.agencyId, actor_roles: roles, decision: "denied", reason });
    return jsonResponse(
      { error: "You do not have permission to perform this action.", code: "forbidden", reason },
      403, a.corsHeaders,
    );
  }

  await pbAudit(a.admin, a.req, { ...base, agency_id: a.agencyId, actor_roles: roles, decision: "allowed" });
  return { roles };
}
