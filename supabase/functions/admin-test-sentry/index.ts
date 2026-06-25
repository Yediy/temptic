// Admin-only edge function that intentionally throws so we can verify
// Sentry is wired up across our Edge Functions.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireUser, jsonResponse } from "../_shared/auth.ts";
import { withSentry, addBreadcrumb, setSentryContext } from "../_shared/sentry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(withSentry("admin-test-sentry", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey);

  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", auth.user.id);

  const isSuper = (roles ?? []).some((r) => r.role === "super_admin");
  if (!isSuper) {
    return jsonResponse({ error: "Forbidden" }, 403, corsHeaders);
  }

  setSentryContext({ user_id: auth.user.id });
  addBreadcrumb("Admin triggered Sentry test from edge function", { user_id: auth.user.id }, "admin");

  // Intentional throw — wrapped handler will report to Sentry and return safe 500.
  throw new Error("Sentry test error from admin-test-sentry edge function");
}, corsHeaders));
