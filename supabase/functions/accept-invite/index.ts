import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { withSentry } from "../_shared/sentry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Look up a user by exact email match via the Supabase Admin REST API.
 * The /admin/users?filter= param is a substring match, so we verify
 * the returned email matches exactly.
 */
async function findUserByExactEmail(
  supabaseUrl: string,
  serviceKey: string,
  email: string
): Promise<string | null> {
  const resp = await fetch(
    `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=5&filter=${encodeURIComponent(email)}`,
    {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
    }
  );

  if (!resp.ok) return null;

  const data = await resp.json();
  const users = data.users || data;
  if (!Array.isArray(users)) return null;

  // Exact match only — filter= is substring-based so we must verify
  const match = users.find(
    (u: { email?: string }) => u.email?.toLowerCase().trim() === email
  );
  return match?.id ?? null;
}

// ── In-memory rate limiter ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_VALIDATE = 20;   // validate is cheap — allow more
const RATE_LIMIT_MAX_ACCEPT = 5;      // accept creates accounts — strict

function isRateLimited(ip: string, action: string): boolean {
  const key = `${ip}:${action}`;
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  // Prune stale entries periodically (keep map small)
  if (rateLimitMap.size > 10_000) {
    for (const [k, v] of rateLimitMap) {
      if (v.resetAt < now) rateLimitMap.delete(k);
    }
  }

  const max = action === "accept" ? RATE_LIMIT_MAX_ACCEPT : RATE_LIMIT_MAX_VALIDATE;

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > max;
}

async function handleValidate(
  supabase: any,
  tokenHash: string
) {
  const { data: invite, error } = await supabase
    .from("client_invites")
    .select(
      "*, clients!inner(company_name), agencies!inner(name), client_signers!inner(first_name, last_name, email)"
    )
    .eq("token_hash", tokenHash)
    .single();

  if (error || !invite) {
    return jsonResponse({ error: "Invalid invite token" }, 404);
  }

  if (invite.status === "accepted") {
    return jsonResponse({ error: "already_accepted", invite }, 400);
  }

  if (invite.status === "revoked") {
    return jsonResponse({ error: "This invite has been revoked" }, 400);
  }

  if (new Date(invite.expires_at) < new Date()) {
    await supabase
      .from("client_invites")
      .update({ status: "expired" })
      .eq("id", invite.id);
    return jsonResponse(
      { error: "This invite has expired. Please ask the agency to resend." },
      400
    );
  }

  return jsonResponse({
    invite: {
      id: invite.id,
      email: invite.email,
      agency_name: (invite as any).agencies?.name,
      client_company: (invite as any).clients?.company_name,
      signer_first_name: (invite as any).client_signers?.first_name,
      signer_last_name: (invite as any).client_signers?.last_name,
    },
  });
}

async function handleAccept(
  supabase: any,
  supabaseUrl: string,
  serviceKey: string,
  tokenHash: string,
  body: {
    email?: string;
    password?: string;
    first_name?: string;
    last_name?: string;
  }
) {
  const { email, password, first_name, last_name } = body;

  // ── Load and validate invite ──
  const { data: invite, error: invErr } = await supabase
    .from("client_invites")
    .select("*")
    .eq("token_hash", tokenHash)
    .eq("status", "pending")
    .single();

  if (invErr || !invite) {
    return jsonResponse({ error: "Invalid or expired invite" }, 400);
  }

  if (new Date(invite.expires_at) < new Date()) {
    await supabase
      .from("client_invites")
      .update({ status: "expired" })
      .eq("id", invite.id);
    return jsonResponse({ error: "This invite has expired" }, 400);
  }

  // ── Resolve and validate target email ──
  const targetEmail = (email || invite.email).toLowerCase().trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
    return jsonResponse({ error: "Invalid email address" }, 400);
  }

  // ── Check if signer is already linked ──
  const { data: signer } = await supabase
    .from("client_signers")
    .select("id, user_id, email")
    .eq("id", invite.client_signer_id)
    .single();

  if (!signer) {
    return jsonResponse({ error: "Signer record not found" }, 400);
  }

  if (signer.user_id) {
    // Already linked — mark invite accepted, tell client to sign in
    await supabase
      .from("client_invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", invite.id);
    return jsonResponse({
      success: true,
      existing_account: true,
      already_linked: true,
      email: targetEmail,
      message:
        "This signer is already linked to an account. You can sign in to the client portal.",
    });
  }

  // ── Find existing user by exact email ──
  const existingUserId = await findUserByExactEmail(
    supabaseUrl,
    serviceKey,
    targetEmail
  );

  let userId: string;

  if (existingUserId) {
    userId = existingUserId;
  } else {
    // ── Create new user ──
    if (!password || password.length < 6) {
      return jsonResponse(
        { error: "Password must be at least 6 characters" },
        400
      );
    }

    // Sanitize name inputs
    const safeName = (val?: string) =>
      (val || "").replace(/[<>"'&]/g, "").trim().slice(0, 100);

    const { data: newUser, error: createErr } =
      await supabase.auth.admin.createUser({
        email: targetEmail,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: safeName(first_name),
          last_name: safeName(last_name),
        },
      });

    if (createErr) {
      return jsonResponse({ error: createErr.message }, 400);
    }

    userId = newUser.user.id;
  }

  // ── Ensure client_user role (idempotent) ──
  const { data: existingRole } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "client_user")
    .maybeSingle();

  if (!existingRole) {
    await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: "client_user" });
  }

  // ── Link user to client_signer (only if still null) ──
  const { error: linkErr } = await supabase
    .from("client_signers")
    .update({ user_id: userId })
    .eq("id", invite.client_signer_id)
    .is("user_id", null);

  if (linkErr) {
    console.error("Failed to link signer:", linkErr);
    return jsonResponse(
      {
        error:
          "Failed to link your account to the signer record. Please contact the agency.",
      },
      500
    );
  }

  // ── Mark invite as accepted ──
  await supabase
    .from("client_invites")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  return jsonResponse({
    success: true,
    existing_account: !!existingUserId,
    email: targetEmail,
    password_provided: !existingUserId && !!password,
    message: existingUserId
      ? "Your account has been linked. You can now sign in."
      : "Account created successfully. Signing you in…",
  });
}

serve(withSentry("accept-invite", async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { action, token, ...rest } = await req.json();

    if (!action || !["validate", "accept"].includes(action)) {
      return jsonResponse({ error: "Invalid action" }, 400);
    }

    // Rate limit by IP
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    if (isRateLimited(clientIp, action)) {
      return jsonResponse({ error: "Too many requests. Please try again later." }, 429);
    }

    if (!token || typeof token !== "string" || token.length < 32 || token.length > 128) {
      return jsonResponse({ error: "Missing or invalid token" }, 400);
    }

    const tokenHash = await hashToken(token);

    if (action === "validate") {
      return handleValidate(supabase, tokenHash);
    }

    if (action === "accept") {
      return handleAccept(supabase, supabaseUrl, serviceKey, tokenHash, rest);
    }

    return jsonResponse({ error: "Invalid action" }, 400);
  } catch (err: any) {
    console.error("accept-invite error:", err);
    return jsonResponse({ error: "An unexpected error occurred." }, 500);
  }
}));
