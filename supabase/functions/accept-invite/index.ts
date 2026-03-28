import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { action, token, email, password, first_name, last_name } =
      await req.json();

    if (!token || typeof token !== "string") {
      return jsonResponse({ error: "Missing or invalid token" }, 400);
    }

    // Hash the incoming token for lookup
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token));
    const tokenHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // ── Validate token (public, no auth required) ──
    if (action === "validate") {
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

    // ── Accept invite (create account + link) ──
    if (action === "accept") {
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

      // ── Resolve target email ──
      const targetEmail = (email || invite.email).toLowerCase().trim();

      // ── Check if signer is already linked to a different user ──
      const { data: signer } = await supabase
        .from("client_signers")
        .select("id, user_id, email")
        .eq("id", invite.client_signer_id)
        .single();

      if (!signer) {
        return jsonResponse({ error: "Signer record not found" }, 400);
      }

      if (signer.user_id) {
        // Already linked — don't overwrite. Mark invite accepted since the signer is set up.
        await supabase
          .from("client_invites")
          .update({ status: "accepted", accepted_at: new Date().toISOString() })
          .eq("id", invite.id);
        return jsonResponse({
          success: true,
          existing_account: true,
          already_linked: true,
          message: "This signer is already linked to an account. You can sign in to the client portal.",
        });
      }

      // ── Find existing user by email using getUserByEmail (no broad scan) ──
      let existingUserId: string | null = null;

      // Supabase Admin API: lookup user by email directly via REST
      // supabase-js admin.listUsers doesn't support email filter, but we can use
      // the REST API directly for a targeted lookup
      const listResp = await fetch(
        `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1&filter=${encodeURIComponent(targetEmail)}`,
        {
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
        }
      );

      if (listResp.ok) {
        const listData = await listResp.json();
        const users = listData.users || listData;
        if (Array.isArray(users)) {
          const match = users.find(
            (u: any) => u.email?.toLowerCase() === targetEmail
          );
          if (match) existingUserId = match.id;
        }
      }

      let userId: string;

      if (existingUserId) {
        userId = existingUserId;
      } else {
        // Create new user
        if (!password || password.length < 6) {
          return jsonResponse(
            { error: "Password must be at least 6 characters" },
            400
          );
        }

        const { data: newUser, error: createErr } =
          await supabase.auth.admin.createUser({
            email: targetEmail,
            password,
            email_confirm: true,
            user_metadata: {
              first_name: first_name || "",
              last_name: last_name || "",
            },
          });

        if (createErr) {
          return jsonResponse({ error: createErr.message }, 400);
        }

        userId = newUser.user.id;
      }

      // ── Ensure client_user role (idempotent upsert) ──
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", "client_user")
        .maybeSingle();

      if (!existingRole) {
        await supabase.from("user_roles").insert({
          user_id: userId,
          role: "client_user",
        });
      }

      // ── Link user to client_signer (safe: we already checked user_id is null above) ──
      const { error: linkErr } = await supabase
        .from("client_signers")
        .update({ user_id: userId })
        .eq("id", invite.client_signer_id)
        .is("user_id", null); // Extra safety: only update if still null

      if (linkErr) {
        console.error("Failed to link signer:", linkErr);
        return jsonResponse(
          { error: "Failed to link your account to the signer record. Please contact the agency." },
          500
        );
      }

      // ── Mark invite as accepted ──
      await supabase
        .from("client_invites")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", invite.id);

      // ── Try to generate a session for auto sign-in ──
      let session_token: string | null = null;
      let refresh_token: string | null = null;

      if (!existingUserId && password) {
        // For newly created users, we can generate a sign-in link
        // or the client can sign in with the password they just set
        try {
          const { data: signInData } = await supabase.auth.admin.generateLink({
            type: "magiclink",
            email: targetEmail,
          });
          if (signInData?.properties?.hashed_token) {
            session_token = signInData.properties.hashed_token;
          }
        } catch {
          // Non-critical — user can still sign in manually
        }
      }

      return jsonResponse({
        success: true,
        existing_account: !!existingUserId,
        session_token,
        refresh_token,
        email: targetEmail,
        password_provided: !existingUserId && !!password,
        message: existingUserId
          ? "Your account has been linked. You can now sign in."
          : "Account created successfully. Signing you in…",
      });
    }

    return jsonResponse({ error: "Invalid action" }, 400);
  } catch (err: any) {
    console.error("accept-invite error:", err);
    return jsonResponse({ error: err.message }, 500);
  }
});
