// Edge function: register-agency
// Replaces the public.register_agency SECURITY DEFINER RPC so that no
// SECURITY DEFINER function is executable by `authenticated` users directly.
// The function validates the caller's JWT and uses the service-role client
// to perform the privileged inserts inside the private schema helper.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireUser, jsonResponse } from "../_shared/auth.ts";
import { withSentry } from "../_shared/sentry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(withSentry("register-agency", async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
  }

  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;
  const { user } = auth;

  let body: { agency_name?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400, corsHeaders);
  }

  const name = typeof body.agency_name === "string" ? body.agency_name.trim() : "";
  if (!name || name.length < 2 || name.length > 120) {
    return jsonResponse({ error: "agency_name must be 2-120 characters" }, 400, corsHeaders);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return jsonResponse({ error: "Server misconfigured." }, 500, corsHeaders);
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Already a member? return existing agency.
  const { data: existing, error: existingErr } = await admin
    .from("agency_members")
    .select("agency_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingErr) {
    return jsonResponse({ error: existingErr.message }, 500, corsHeaders);
  }
  if (existing?.agency_id) {
    return jsonResponse({ agency_id: existing.agency_id }, 200, corsHeaders);
  }

  const { data: agency, error: agencyErr } = await admin
    .from("agencies")
    .insert({ name })
    .select("id")
    .single();
  if (agencyErr || !agency) {
    return jsonResponse({ error: agencyErr?.message ?? "Failed to create agency" }, 500, corsHeaders);
  }

  const { error: memberErr } = await admin
    .from("agency_members")
    .insert({ agency_id: agency.id, user_id: user.id, role: "agency_admin" });
  if (memberErr) {
    return jsonResponse({ error: memberErr.message }, 500, corsHeaders);
  }

  const { error: roleErr } = await admin
    .from("user_roles")
    .insert({ user_id: user.id, role: "agency_admin" });
  if (roleErr) {
    return jsonResponse({ error: roleErr.message }, 500, corsHeaders);
  }

  return jsonResponse({ agency_id: agency.id }, 200, corsHeaders);
}));
