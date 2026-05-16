import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CreditCard, Check, AlertTriangle } from "lucide-react";

const features = [
  "Agency portal",
  "Client portal",
  "Worker portal",
  "Daily and weekly tickets",
  "Client onboarding and invites",
  "Approval tracking",
  "Archive and records",
  "Template support",
  "Admin tools",
  "Email notifications when configured",
];

export default function Billing() {
  const { agencyId } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (interval: "monthly" | "annual") => {
    if (!agencyId) return;
    setLoading(interval);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          agency_id: agencyId,
          plan: interval,
          success_url: `${window.location.origin}/billing?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/billing`,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.info("Stripe checkout is not configured yet. Contact your administrator to connect Stripe.");
      }
    } catch (err: any) {
      const msg = err.message?.toLowerCase() || "";
      if (msg.includes("fetch") || msg.includes("function") || msg.includes("not found")) {
        toast.info("Billing is not active yet. Stripe integration needs to be configured.");
      } else {
        toast.error(err.message || "Failed to start checkout");
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-8 animate-fade-in">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">One simple price for your agency</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create tickets, onboard client approvers, manage worker records, and keep approvals organized in one place.
        </p>
      </div>

      <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
        <div>
          <strong className="text-warning">Activation pending</strong>
          <p className="text-muted-foreground mt-0.5">
            Billing requires a Stripe account to be connected. Pricing shown below is for reference — checkout will be enabled once Stripe is configured.
          </p>
        </div>
      </div>

      {/* Plan Card */}
      <div className="rounded-2xl border-2 border-primary bg-card shadow-lg">
        <div className="border-b border-border/60 px-8 py-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">Temp Tic Agency</p>
          <div className="mt-4 flex items-baseline justify-center gap-1">
            <span className="text-5xl font-extrabold tracking-tight text-foreground">$80</span>
            <span className="text-lg text-muted-foreground">/month</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            or <span className="font-semibold text-foreground">$816/year</span>
          </p>
          <span className="mt-2 inline-block rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
            Save 15% with annual billing
          </span>
        </div>

        <div className="px-8 py-6">
          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3 border-t border-border/60 px-8 py-6">
          <Button
            className="w-full"
            size="lg"
            onClick={() => handleCheckout("monthly")}
            disabled={loading === "monthly"}
          >
            <CreditCard className="mr-1.5 h-4 w-4" />
            {loading === "monthly" ? "Loading…" : "Start Monthly"}
          </Button>
          <Button
            className="w-full"
            variant="outline"
            size="lg"
            onClick={() => handleCheckout("annual")}
            disabled={loading === "annual"}
          >
            <CreditCard className="mr-1.5 h-4 w-4" />
            {loading === "annual" ? "Loading…" : "Start Annual"}
          </Button>
        </div>
      </div>

      <p className="text-center text-sm font-semibold text-muted-foreground">
        One agency. One price. No per-worker nonsense.
      </p>
    </div>
  );
}
