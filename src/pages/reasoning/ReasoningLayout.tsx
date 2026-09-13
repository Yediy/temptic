import { NavLink, Outlet } from "react-router-dom";
import { Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContractChips } from "@/components/reasoning/ReasonBits";

const tabs = [
  { to: "/reasoning", label: "Reasoning Overview", end: true },
  { to: "/reasoning/active", label: "Active Reasoning" },
  { to: "/reasoning/conclusions", label: "Conclusions" },
  { to: "/reasoning/hypotheses", label: "Hypotheses" },
  { to: "/reasoning/evidence", label: "Evidence" },
  { to: "/reasoning/contradictions", label: "Contradictions" },
  { to: "/reasoning/alternatives", label: "Alternatives" },
  { to: "/reasoning/critical-review", label: "Critical Review" },
  { to: "/reasoning/causality", label: "Causality" },
  { to: "/reasoning/disagreements", label: "Model Disagreement" },
  { to: "/reasoning/history", label: "Reasoning History" },
  { to: "/reasoning/health", label: "Health" },
];

export default function ReasoningLayout() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <header className="flex flex-wrap items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Scale className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Reasoning &amp; Evidence</h1>
          <p className="text-sm text-muted-foreground">
            What WOIC concluded, what evidence supports or contradicts it, what assumptions and alternatives
            exist, how confident it is, and what remains uncertain.
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-xs text-muted-foreground">
        <p>
          All reasoning — conclusion formation, evidence weighting, confidence, causal classification and
          critical review — is performed by WOIC (Phase 6.3A). This workspace observes and requests only; it
          holds no local reasoning engine, no local confidence engine, and never displays private reasoning.
        </p>
        <ContractChips />
      </div>

      <nav className="flex flex-wrap gap-1 overflow-x-auto border-b" aria-label="Reasoning sections">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) => cn(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
