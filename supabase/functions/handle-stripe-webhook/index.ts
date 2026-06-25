// Stripe webhook handler.
// Verifies Stripe signature, dedupes events via public.stripe_events,
// and updates the agencies table with subscription state.
//
// Configure in Stripe Dashboard:
//   Endpoint: https://<project>.supabase.co/functions/v1/handle-stripe-webhook
//   Events:
//     - checkout.session.completed
//     - invoice.paid
//     - invoice.payment_failed
//     - customer.subscription.updated
//     - customer.subscription.deleted

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { withSentry } from "../_shared/sentry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "stripe-signature, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(withSentry("handle-stripe-webhook", async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!stripeKey || !webhookSecret) {
    console.error("[stripe-webhook] missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    return json({ error: "Webhook not configured." }, 500);
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return json({ error: "Missing stripe-signature header." }, 401);

  const rawBody = await req.text();
  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error("[stripe-webhook] signature verification failed:", err?.message);
    return json({ error: "Invalid signature." }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Dedupe — insert event row first; on conflict skip.
  const { error: insertErr } = await supabase
    .from("stripe_events")
    .insert({ id: event.id, type: event.type, payload: event as unknown as Record<string, unknown> });

  if (insertErr) {
    // 23505 = unique_violation -> already processed
    if ((insertErr as any).code === "23505") {
      return json({ received: true, duplicate: true });
    }
    console.error("[stripe-webhook] failed to record event:", insertErr);
    return json({ error: "Storage error." }, 500);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const agencyId = session.metadata?.agency_id;
        const plan = session.metadata?.plan ?? null;
        if (!agencyId) break;

        let subStatus: string | null = null;
        let currentPeriodEnd: string | null = null;
        let cancelAt: string | null = null;
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          subStatus = sub.status;
          currentPeriodEnd = sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null;
          cancelAt = sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null;
        }

        await supabase
          .from("agencies")
          .update({
            stripe_customer_id: (session.customer as string) ?? null,
            stripe_subscription_id: (session.subscription as string) ?? null,
            subscription_status: subStatus ?? "active",
            subscription_plan: plan,
            subscription_current_period_end: currentPeriodEnd,
            subscription_cancel_at: cancelAt,
          })
          .eq("id", agencyId);
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string | null;
        if (!subId) break;
        const sub = await stripe.subscriptions.retrieve(subId);
        await supabase
          .from("agencies")
          .update({
            subscription_status: sub.status,
            subscription_current_period_end: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
          })
          .eq("stripe_subscription_id", subId);
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from("agencies")
          .update({
            subscription_status: sub.status,
            subscription_current_period_end: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
            subscription_cancel_at: sub.cancel_at
              ? new Date(sub.cancel_at * 1000).toISOString()
              : null,
          })
          .eq("stripe_subscription_id", sub.id);
        break;
      }

      default:
        // Acknowledge unhandled events so Stripe doesn't retry.
        break;
    }

    await supabase
      .from("stripe_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", event.id);

    return json({ received: true });
  } catch (err: any) {
    console.error("[stripe-webhook] handler error:", err?.message ?? err);
    // Don't 500 — Stripe will retry. We already recorded the event; allow manual reprocessing.
    return json({ received: true, error: "deferred" });
  }
}));
