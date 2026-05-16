// Shared auth helpers for Edge Functions.
// Goal: every unauthenticated request returns a predictable JSON body
//   { error: string, code: "unauthenticated" | "invalid_token" }
// with HTTP 401 — never 500 — so the frontend can branch reliably.

import { createClient, type SupabaseClient, type User } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type AuthErrorCode = "unauthenticated" | "invalid_token" | "forbidden";

export function jsonResponse(
  body: unknown,
  status: number,
  corsHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function unauthorizedResponse(
  corsHeaders: Record<string, string> = {},
  code: AuthErrorCode = "unauthenticated",
  message?: string,
): Response {
  const defaults: Record<AuthErrorCode, string> = {
    unauthenticated: "Authentication required.",
    invalid_token: "Invalid or expired session.",
    forbidden: "You do not have permission to perform this action.",
  };
  return jsonResponse(
    { error: message ?? defaults[code], code },
    code === "forbidden" ? 403 : 401,
    corsHeaders,
  );
}

/**
 * Validates the caller's JWT and returns the authenticated user plus a
 * user-scoped Supabase client. Returns a 401 Response on any auth failure.
 *
 * Usage:
 *   const auth = await requireUser(req, corsHeaders);
 *   if (auth instanceof Response) return auth;
 *   const { user, userClient } = auth;
 */
export async function requireUser(
  req: Request,
  corsHeaders: Record<string, string> = {},
): Promise<{ user: User; userClient: SupabaseClient; authHeader: string } | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return unauthorizedResponse(corsHeaders, "unauthenticated");
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) {
    return jsonResponse(
      { error: "Server misconfigured.", code: "server_error" },
      500,
      corsHeaders,
    );
  }

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) {
    return unauthorizedResponse(corsHeaders, "invalid_token");
  }

  return { user: data.user, userClient, authHeader };
}
