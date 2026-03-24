import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CreditCard, Check } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "$29",
    period: "/mo",
    features: ["Up to 50 tickets/mo", "1 agency user", "PDF generation", "Email notifications"],
    priceId: "starter",
  },
  {
    name: "Growth",
    price: "$79",
    period: "/mo",
    features: ["Up to 300 tickets/mo", "5 agency users", "Custom templates", "Priority support"],
    priceId: "growth",
    popular: true,
  },
  {
    name: "Pro",
    price: "$149",
    period: "/mo",
    features: ["Unlimited tickets", "Unlimited users", "Custom branding", "API access", "Dedicated support"],
    priceId: "pro",
  },
];

export default function Billing() {
  const { agencyId } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (priceId: string) => {
    if (!agencyId) return;
    setLoading(priceId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { agency_id: agencyId, plan: priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.info("Checkout session created (Stripe not configured yet)");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing & Plans</h1>
        <p className="text-sm text-muted-foreground">Choose the plan that fits your agency.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {plans.map(plan => (
          <div
            key={plan.priceId}
            className={`rounded-xl border p-6 transition-all ${
              plan.popular ? "border-primary ring-1 ring-primary shadow-lg" : "bg-card hover:shadow-md"
            }`}
          >
            {plan.popular && (
              <span className="mb-3 inline-block rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                Most Popular
              </span>
            )}
            <h3 className="text-lg font-bold">{plan.name}</h3>
            <div className="mt-2 mb-4">
              <span className="text-3xl font-bold">{plan.price}</span>
              <span className="text-sm text-muted-foreground">{plan.period}</span>
            </div>
            <ul className="space-y-2 mb-6">
              {plan.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-success" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              className="w-full"
              variant={plan.popular ? "default" : "outline"}
              onClick={() => handleCheckout(plan.priceId)}
              disabled={loading === plan.priceId}
            >
              <CreditCard className="mr-1 h-4 w-4" />
              {loading === plan.priceId ? "Loading…" : "Select Plan"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
