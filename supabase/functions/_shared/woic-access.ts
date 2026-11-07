// WOIC access guard: tenant membership + role matrix + module scope, with every
// decision written to woic_access_audit. Policy lives in woic-policy.ts.
import type { SupabaseClient, User } from "npm:@supabase/supabase-js@2";
import { jsonResponse } from "./auth.ts";
import { evaluateWoicAccess, resolveWoicPermission, type WoicPermission } from "./woic-policy.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Module comes from the x-woic-module header or body.module; defaults to the admin console. */
export function callerModule(req: Request, body: unknown): string {
  const fromBody = (body as { module?: unknown })?.module;
  const raw = req.headers.get("x-woic-module") ?? (typeof fromBody === "string" ? fromBody : "") ?? "";
  return (raw || "console").toLowerCase().slice(0, 40);
}

export async function requireWoicAccess(a: {
  admin: SupabaseClient;
  req: Request;
  user: User;
  functionName: string;
  operation: string;
  agencyId: unknown;
  params?: Record<string, unknown>;
  module: string;
  corsHeaders: Record<string, string>;
}): Promise<{ roles: string[]; permission: WoicPermission } | Response> {
  const permission = resolveWoicPermission(a.functionName, a.operation, a.params ?? {});
  const agencyId = typeof a.agencyId === "string" && UUID_RE.test(a.agencyId) ? a.agencyId : null;
  const audit = async (decision: "allowed" | "denied", roles: string[], reason: string | null) => {
    try {
      await a.admin.from("woic_access_audit").insert({
        agency_id: agencyId, actor_id: a.user.id, actor_roles: roles,
        function_name: a.functionName, operation: a.operation.slice(0, 80), module: a.module,
        resource: permission?.resource ?? null, access: permission?.access ?? null,
        decision, reason,
        ip_address: a.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        user_agent: a.req.headers.get("user-agent")?.slice(0, 500) ?? null,
      });
    } catch (e) {
      console.error("woic access audit failed", e);
    }
  };

  if (!agencyId) {
    await audit("denied", [], "invalid_agency_id");
    return jsonResponse({ error: "agency_id must be a uuid", code: "bad_request" }, 400, a.corsHeaders);
  }

  const [{ data: globalRoles }, { data: membership }] = await Promise.all([
    a.admin.from("user_roles").select("role").eq("user_id", a.user.id),
    a.admin.from("agency_members").select("role, is_active")
      .eq("user_id", a.user.id).eq("agency_id", agencyId).maybeSingle(),
  ]);
  const roleSet = new Set<string>((globalRoles ?? []).map((r: { role: string }) => String(r.role)));
  const isMember = !!membership && membership.is_active !== false;
  // Agency-scoped roles only count inside that agency; global roles other than super_admin
  // only count when the caller is also a member of this agency.
  const roles = isMember
    ? [...new Set([...roleSet, ...(membership?.role ? [String(membership.role)] : [])])]
    : roleSet.has("super_admin") ? ["super_admin"] : [];

  const result = evaluateWoicAccess({ permission, roles, isMember, module: a.module });
  if (!result.allowed) {
    await audit("denied", roles, result.reason);
    const status = result.reason === "unknown_operation" ? 400 : 403;
    return jsonResponse(
      { error: status === 400 ? "Unsupported WOIC operation." : "You do not have permission to access this WOIC data.", code: status === 400 ? "bad_request" : "forbidden", reason: result.reason },
      status, a.corsHeaders,
    );
  }
  await audit("allowed", roles, null);
  return { roles, permission: permission! };
}
