import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireUser } from "../_shared/auth.ts";
import { withSentry } from "../_shared/sentry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Two billing intervals for the single Temp Tic Agency plan.
const PRICE_MAP: Record<string, string> = {
  monthly: "price_1TXclAAjMcXyRGlsIDhJUlvS",
  annual: "price_1TXcmuAjMcXyRGlsZg8itV53",
};

serve(withSentry("create-checkout-session", async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;
  const { user } = auth;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    const supabase = createClient(supabaseUrl, serviceKey);

    const { agency_id, plan, success_url, cancel_url } = await req.json();

    if (!plan || !PRICE_MAP[plan]) {
      throw new Error("Invalid plan: " + plan + ". Use 'monthly' or 'annual'.");
    }

    // Verify user belongs to agency
    const { data: membership } = await supabase
      .from("agency_members")
      .select("agency_id, role")
      .eq("user_id", user.id)
      .eq("agency_id", agency_id)
      .eq("is_active", true)
      .in("role", ["agency_owner", "agency_admin"])
      .limit(1)
      .maybeSingle();

    if (!membership || !/^[0-9a-f-]{36}$/i.test(String(agency_id))) {
      return new Response(JSON.stringify({ error: "Forbidden", code: "forbidden" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403,
      });
    }

    // Only redirect back to our own app origins.
    const ORIGIN_OK = /^(https:\/\/([a-z0-9-]+\.)*(lovable\.app|lovableproject\.com|temptic\.net)|http:\/\/localhost(:\d+)?)$/i;
    const safeUrl = (u: unknown) => {
      if (typeof u !== "string") return null;
      try { const p = new URL(u); return ORIGIN_OK.test(p.origin) ? p.toString() : null; } catch { return null; }
    };
    const safeSuccess = safeUrl(success_url);
    const safeCancel = safeUrl(cancel_url);

    if (!stripeKey) {
      return new Response(
        JSON.stringify({
          message: "Stripe is not configured yet. Add STRIPE_SECRET_KEY to edge function secrets and update PRICE_MAP with real Stripe price IDs.",
          url: null,
          plan,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const priceId = PRICE_MAP[plan];

    if (priceId.includes("placeholder")) {
      return new Response(
        JSON.stringify({
          message: "Stripe is configured but PRICE_MAP still contains placeholder price IDs. Update them with real Stripe price IDs from your Stripe Dashboard.",
          url: null,
          plan,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Look up or create Stripe customer
    const customerSearchRes = await fetch("https://api.stripe.com/v1/customers/search?" + new URLSearchParams({
      query: `metadata['agency_id']:'${agency_id}'`,
    }), {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    const customerSearch = await customerSearchRes.json();

    let customerId: string;
    if (customerSearch.data && customerSearch.data.length > 0) {
      customerId = customerSearch.data[0].id;
    } else {
      const createRes = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          email: user.email || "",
          "metadata[agency_id]": agency_id,
          "metadata[user_id]": user.id,
        }),
      });
      const created = await createRes.json();
      if (created.error) throw new Error(created.error.message);
      customerId = created.id;
    }

    // Create Checkout Session
    const origin = safeSuccess ? new URL(safeSuccess).origin : "https://temptic.lovable.app";

    const sessionRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        customer: customerId,
        mode: "subscription",
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": "1",
        success_url: safeSuccess || `${origin}/billing?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: safeCancel || `${origin}/billing`,
        "metadata[agency_id]": agency_id,
        "metadata[plan]": plan,
        "subscription_data[metadata][agency_id]": agency_id,
      }),
    });

    const session = await sessionRes.json();
    if (session.error) throw new Error(session.error.message);

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    console.error("[create-checkout-session] internal error:", err);
    return new Response(JSON.stringify({ error: "An unexpected error occurred." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}));
