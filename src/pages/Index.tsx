import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

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

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/60 bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">T</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">Temp Tic</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/login")}>
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero + Pricing */}
      <main className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Simple pricing for staffing agencies
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
            Temp Tic gives your agency one place to create tickets, onboard client approvers, manage worker access, and keep approval records clean.
          </p>
        </div>

        {/* Plan Card */}
        <div className="mx-auto mt-12 max-w-md">
          <div className="rounded-2xl border-2 border-primary bg-card shadow-lg">
            {/* Header */}
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

            {/* Features */}
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

            {/* CTAs */}
            <div className="flex flex-col gap-3 border-t border-border/60 px-8 py-6">
              <Button className="w-full" size="lg" onClick={() => navigate("/register")}>
                Start Monthly
              </Button>
              <Button className="w-full" variant="outline" size="lg" onClick={() => navigate("/register")}>
                Start Annual
              </Button>
            </div>
          </div>
        </div>

        {/* Positioning line */}
        <p className="mt-10 text-center text-base font-semibold text-muted-foreground">
          One agency. One price. No per-worker nonsense.
        </p>
      </main>
    </div>
  );
}
