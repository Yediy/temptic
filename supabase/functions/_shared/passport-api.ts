// Universal Passport API — shared scope registry + permission resolution.
// Any future IWOS operating profile consumes verified passport data through
// these scopes only. Nothing here trusts the caller: every scope must be
// explicitly granted by the passport owner (or held implicitly by the owner).

import type { SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const PASSPORT_SCOPES = [
  "identity",
  "verifications",
  "compliance",
  "credentials",
  "skills",
  "training",
  "badges",
  "reputation",
  "portfolio",
  "availability",
  "work_history",
] as const;

export type PassportScope = (typeof PASSPORT_SCOPES)[number];

export const isScope = (s: unknown): s is PassportScope =>
  typeof s === "string" && (PASSPORT_SCOPES as readonly string[]).includes(s);

export type Grant = {
  /** How the caller proved access. */
  via: "owner" | "agency" | "share_token" | "super_admin";
  scopes: PassportScope[];
  permission_id: string | null;
  expires_at: string | null;
  grantee_id: string | null;
};

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const notExpired = (row: { expires_at: string | null; revoked_at: string | null }) =>
  !row.revoked_at && (!row.expires_at || new Date(row.expires_at).getTime() > Date.now());

/**
 * Resolves what the caller is allowed to read from a passport.
 * Returns null when the caller has no valid access path.
 */
export async function resolveGrant(opts: {
  admin: SupabaseClient;
  userClient: SupabaseClient;
  user: User;
  passportId: string;
  workerUserId: string | null;
  shareToken?: string | null;
}): Promise<Grant | null> {
  const { admin, userClient, user, passportId, workerUserId, shareToken } = opts;

  // 1. Owner — full access to their own passport.
  if (workerUserId && workerUserId === user.id) {
    return { via: "owner", scopes: [...PASSPORT_SCOPES], permission_id: null, expires_at: null, grantee_id: null };
  }

  // 2. Explicit share token (approved, unexpired, token-bound permission).
  if (shareToken) {
    const hash = await sha256Hex(shareToken);
    const { data } = await admin
      .from("passport_permissions")
      .select("id, scopes, status, expires_at, revoked_at, grantee_id")
      .eq("passport_id", passportId)
      .eq("share_token_hash", hash)
      .eq("status", "approved")
      .maybeSingle();
    if (data && notExpired(data as never)) {
      return {
        via: "share_token",
        scopes: ((data as never as { scopes: string[] }).scopes ?? []).filter(isScope),
        permission_id: (data as never as { id: string }).id,
        expires_at: (data as never as { expires_at: string | null }).expires_at,
        grantee_id: (data as never as { grantee_id: string | null }).grantee_id,
      };
    }
    return null;
  }

  // 3. Agency grant — caller must be an active member of a granted agency.
  const { data: memberships } = await userClient
    .from("agency_members").select("agency_id").eq("user_id", user.id).eq("is_active", true);
  const agencyIds = (memberships ?? []).map((m: { agency_id: string }) => m.agency_id);
  if (agencyIds.length) {
    const { data: perms } = await admin
      .from("passport_permissions")
      .select("id, scopes, status, expires_at, revoked_at, grantee_id, grantee_type")
      .eq("passport_id", passportId)
      .eq("grantee_type", "agency")
      .eq("status", "approved")
      .in("grantee_id", agencyIds);
    const valid = (perms ?? []).filter((p) => notExpired(p as never));
    if (valid.length) {
      const scopes = Array.from(
        new Set(valid.flatMap((p) => ((p as never as { scopes: string[] }).scopes ?? []))),
      ).filter(isScope);
      const first = valid[0] as never as { id: string; expires_at: string | null; grantee_id: string | null };
      return { via: "agency", scopes, permission_id: first.id, expires_at: first.expires_at, grantee_id: first.grantee_id };
    }
  }

  // 4. Platform super admins may read for oversight (always logged).
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
  if ((roles ?? []).some((r: { role: string }) => r.role === "super_admin")) {
    return { via: "super_admin", scopes: [...PASSPORT_SCOPES], permission_id: null, expires_at: null, grantee_id: null };
  }

  return null;
}
