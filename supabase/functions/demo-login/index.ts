// Demo login: creates (or fetches) a fixed demo user, links it to the seeded
// demo agency, and returns a Supabase session the frontend can persist.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEMO_EMAIL = "demo@temptic.app";
// Random fixed password — only the function ever uses it.
const DEMO_PASSWORD = "Tt-Demo-Acct-2026!read-only";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Locate the seeded demo agency.
    const { data: agency, error: agencyErr } = await admin
      .from("agencies")
      .select("id, name")
      .eq("is_demo", true)
      .maybeSingle();

    if (agencyErr || !agency) {
      return new Response(
        JSON.stringify({ error: "Demo environment is not configured." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Find or create the demo auth user.
    let userId: string | null = null;
    const list = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list.data?.users?.find((u) => u.email === DEMO_EMAIL);

    if (existing) {
      userId = existing.id;
      // Ensure the password is the known one (in case it was rotated externally).
      await admin.auth.admin.updateUserById(existing.id, { password: DEMO_PASSWORD });
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { first_name: "Demo", last_name: "User" },
      });
      if (createErr || !created.user) {
        return new Response(
          JSON.stringify({ error: "Could not initialize demo account." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      userId = created.user.id;
    }

    // 3. Link to demo agency as agency_admin (idempotent).
    const { data: membership } = await admin
      .from("agency_members")
      .select("id")
      .eq("user_id", userId)
      .eq("agency_id", agency.id)
      .maybeSingle();

    if (!membership) {
      await admin.from("agency_members").insert({
        user_id: userId,
        agency_id: agency.id,
        role: "agency_admin",
        is_active: true,
      });
    }

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "agency_admin")
      .maybeSingle();

    if (!roleRow) {
      await admin.from("user_roles").insert({
        user_id: userId,
        role: "agency_admin",
      });
    }

    // 4. Issue a fresh session via password sign-in (uses anon client).
    const anon = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: session, error: signInErr } = await anon.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });

    if (signInErr || !session.session) {
      return new Response(
        JSON.stringify({ error: "Could not start demo session." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        access_token: session.session.access_token,
        refresh_token: session.session.refresh_token,
        agency: { id: agency.id, name: agency.name },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message ?? "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
