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

    // Authenticate the caller
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Authentication required.", code: "unauthenticated" }, 401);
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user) {
      return jsonResponse({ error: "Invalid or expired session.", code: "invalid_token" }, 401);
    }

    // Verify caller is agency_admin
    const { data: roleCheck } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "agency_admin")
      .maybeSingle();

    if (!roleCheck) {
      return jsonResponse({ error: "Only agency admins can send invites" }, 403);
    }

    // Get caller's agency
    const { data: membership } = await supabase
      .from("agency_members")
      .select("agency_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!membership) {
      return jsonResponse({ error: "No active agency membership" }, 403);
    }

    const agencyId = membership.agency_id;

    const {
      client_id,
      client_signer_id,
      email,
      signer_name,
      client_company,
      agency_name,
      origin_url,
      old_invite_id,
    } = await req.json();

    // Validate required fields
    if (!client_id || !client_signer_id || !email) {
      return jsonResponse({ error: "Missing required fields: client_id, client_signer_id, email" }, 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return jsonResponse({ error: "Invalid email format" }, 400);
    }

    // If resending, revoke the old invite first
    if (old_invite_id) {
      await supabase
        .from("client_invites")
        .update({ status: "revoked" })
        .eq("id", old_invite_id)
        .eq("agency_id", agencyId)
        .eq("status", "pending");
    }

    // Generate token server-side
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const plainToken = Array.from(tokenBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Compute hash
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(plainToken));
    const tokenHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Insert invite with only the hash — no plaintext token stored
    const { data: invite, error: insertErr } = await supabase
      .from("client_invites")
      .insert({
        agency_id: agencyId,
        client_id,
        client_signer_id,
        email: email.toLowerCase().trim(),
        created_by: user.id,
        token_hash: tokenHash,
      })
      .select("id, agency_id, client_id, client_signer_id, email, status, expires_at, accepted_at, created_by, created_at")
      .single();

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return jsonResponse({ error: insertErr.message }, 400);
    }

    // Resolve agency name
    let resolvedAgencyName = agency_name;
    if (!resolvedAgencyName) {
      const { data: agency } = await supabase
        .from("agencies")
        .select("name")
        .eq("id", agencyId)
        .single();
      resolvedAgencyName = agency?.name || "Your Agency";
    }

    // Build invite URL and send email
    const baseUrl = origin_url || "https://temptic.lovable.app";
    const inviteUrl = `${baseUrl}/client/onboarding/${plainToken}`;

    try {
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "client-invite",
          recipientEmail: email.toLowerCase().trim(),
          idempotencyKey: `client-invite-${invite.id}`,
          templateData: {
            agencyName: resolvedAgencyName || "Your Agency",
            clientCompany: client_company || "Your Company",
            signerName: signer_name || "",
            inviteUrl,
          },
        },
      });
    } catch (emailErr) {
      console.error("Failed to send invite email:", emailErr);
      // Don't fail — invite was created successfully
    }

    return jsonResponse({ invite });
  } catch (err: any) {
    console.error("create-invite error:", err);
    return jsonResponse({ error: err.message }, 500);
  }
});
