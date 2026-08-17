import { NavLink, Outlet } from "react-router-dom";
import { Radar } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContractChips } from "@/components/perception/PerceptionBits";

const tabs = [
  { to: "/perception", label: "Perception Overview", end: true },
  { to: "/perception/observations", label: "Live Observations" },
  { to: "/perception/context-packs", label: "Context Packs" },
  { to: "/perception/entities", label: "Entity Resolution" },
  { to: "/perception/relevance", label: "Relevance" },
  { to: "/perception/attention", label: "Attention Signals" },
  { to: "/perception/contradictions", label: "Contradictions" },
  { to: "/perception/missing", label: "Missing Information" },
  { to: "/perception/freshness", label: "Context Freshness" },
  { to: "/perception/sources", label: "Source Health" },
  { to: "/perception/settings", label: "Settings" },
];

export default function PerceptionLayout() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <header className="flex flex-wrap items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Radar className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Perception &amp; Context</h1>
          <p className="text-sm text-muted-foreground">
            What WOIC observed, where it came from, what context it assembled, what it ignored, and what is
            still missing.
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-xs text-muted-foreground">
        <p>
          All perception, entity resolution, relevance ranking, salience scoring and contradiction detection is
          performed by WOIC (Phase 6.1A). This workspace observes only — it computes nothing and never displays
          private reasoning.
        </p>
        <ContractChips />
      </div>

      <nav className="flex flex-wrap gap-1 overflow-x-auto border-b" aria-label="Perception sections">
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
