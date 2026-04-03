import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Two billing intervals for the single Temp Tic Agency plan.
// Replace with real Stripe price IDs once created in the Stripe Dashboard.
const PRICE_MAP: Record<string, string> = {
  monthly: "price_monthly_placeholder",
  annual: "price_annual_placeholder",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth header");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) throw new Error("Unauthorized");

    const { agency_id, plan, success_url, cancel_url } = await req.json();

    if (!plan || !PRICE_MAP[plan]) {
      throw new Error("Invalid plan: " + plan + ". Use 'monthly' or 'annual'.");
    }

    // Verify user belongs to agency
    const { data: membership } = await supabase
      .from("agency_members")
      .select("agency_id")
      .eq("user_id", user.id)
      .eq("agency_id", agency_id)
      .eq("is_active", true)
      .single();

    if (!membership) throw new Error("Not authorized for this agency");

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
      query: `email:"${user.email}"`,
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
    const origin = success_url
      ? new URL(success_url).origin
      : "https://temptic.lovable.app";

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
        success_url: success_url || `${origin}/billing?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancel_url || `${origin}/billing`,
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
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
