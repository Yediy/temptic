import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // ── Validate token (public, no auth required) ──
    if (action === "validate") {
      const { data: invite, error } = await supabase
        .from("client_invites")
        .select(
          "*, clients!inner(company_name), agencies!inner(name), client_signers!inner(first_name, last_name, email)"
        )
        .eq("token", token)
        .single();

      if (error || !invite) {
        return new Response(
          JSON.stringify({ error: "Invalid invite token" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }

      if (invite.status === "accepted") {
        return new Response(
          JSON.stringify({ error: "already_accepted", invite }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      if (invite.status === "revoked") {
        return new Response(
          JSON.stringify({ error: "This invite has been revoked" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      if (new Date(invite.expires_at) < new Date()) {
        // Auto-expire
        await supabase
          .from("client_invites")
          .update({ status: "expired" })
          .eq("id", invite.id);
        return new Response(
          JSON.stringify({ error: "This invite has expired. Please ask the agency to resend." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      return new Response(
        JSON.stringify({
          invite: {
            id: invite.id,
            email: invite.email,
            agency_name: (invite as any).agencies?.name,
            client_company: (invite as any).clients?.company_name,
            signer_first_name: (invite as any).client_signers?.first_name,
            signer_last_name: (invite as any).client_signers?.last_name,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Accept invite (create account + link) ──
    if (action === "accept") {
      // Look up the invite
      const { data: invite, error: invErr } = await supabase
        .from("client_invites")
        .select("*")
        .eq("token", token)
        .eq("status", "pending")
        .single();

      if (invErr || !invite) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired invite" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      if (new Date(invite.expires_at) < new Date()) {
        await supabase
          .from("client_invites")
          .update({ status: "expired" })
          .eq("id", invite.id);
        return new Response(
          JSON.stringify({ error: "This invite has expired" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Check if user already exists with this email
      const targetEmail = (email || invite.email).toLowerCase();
      const { data: existingUsers } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });
      // listUsers doesn't support email filter — search manually in a targeted way
      let existingUser = existingUsers?.users?.find(
        (u) => u.email?.toLowerCase() === targetEmail
      );
      // If not found in first page, try a direct lookup approach
      if (!existingUser) {
        // Try signing in with a dummy password to check existence — not ideal
        // Instead, just search with a broader page if needed
        const { data: allUsers } = await supabase.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });
        existingUser = allUsers?.users?.find(
          (u) => u.email?.toLowerCase() === targetEmail
        );
      }

      let userId: string;

      if (existingUser) {
        // User already has an account — just link them
        userId = existingUser.id;
      } else {
        // Create new user
        if (!password || password.length < 6) {
          return new Response(
            JSON.stringify({ error: "Password must be at least 6 characters" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
          email: email || invite.email,
          password,
          email_confirm: true,
          user_metadata: {
            first_name: first_name || "",
            last_name: last_name || "",
          },
        });

        if (createErr) {
          return new Response(
            JSON.stringify({ error: createErr.message }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        userId = newUser.user.id;

        // Assign client_user role
        await supabase.from("user_roles").insert({
          user_id: userId,
          role: "client_user",
        });
      }

      // Link user to client_signer record
      await supabase
        .from("client_signers")
        .update({ user_id: userId })
        .eq("id", invite.client_signer_id);

      // Mark invite as accepted
      await supabase
        .from("client_invites")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", invite.id);

      // Ensure client_user role exists (idempotent)
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

      return new Response(
        JSON.stringify({
          success: true,
          existing_account: !!existingUser,
          message: existingUser
            ? "Your account has been linked. You can now sign in."
            : "Account created successfully. You can now sign in.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
