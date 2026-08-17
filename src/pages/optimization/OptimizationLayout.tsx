import { NavLink, Outlet } from "react-router-dom";
import { Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOptSettings, useOptimizationRuns } from "@/hooks/optimization/use-optimization";
import { ConstitutionNotice } from "@/components/optimization/OptBits";

const tabs = [
  { to: "/optimization", label: "Home", end: true },
  { to: "/optimization/objectives", label: "Objective Builder" },
  { to: "/optimization/constraints", label: "Constraint Center" },
  { to: "/optimization/strategies", label: "Strategy Explorer" },
  { to: "/optimization/compare", label: "Compare" },
  { to: "/optimization/pareto", label: "Pareto Explorer" },
  { to: "/optimization/sensitivity", label: "Sensitivity Lab" },
  { to: "/optimization/resources", label: "Resource Planner" },
  { to: "/optimization/risk", label: "Risk & Tradeoffs" },
  { to: "/optimization/runs", label: "Runs" },
  { to: "/optimization/calibration", label: "Calibration" },
  { to: "/optimization/saved", label: "Saved" },
  { to: "/optimization/settings", label: "Settings" },
];

export default function OptimizationLayout() {
  const [settings, setSettings] = useOptSettings();
  const runs = useOptimizationRuns();
  const active = runs.filter((r) => r.status === "running").length;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <header className="flex flex-wrap items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Gauge className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Platform Optimization Workspace</h1>
          <p className="text-sm text-muted-foreground">
            Define objectives and constraints, explore optimized strategies and route a selection to Decision Intelligence.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {active > 0 && (
            <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-1 text-xs text-primary">
              {active} running
            </span>
          )}
          <div className="flex rounded-md border p-0.5" role="group" aria-label="Presentation mode">
            {(["executive", "analyst"] as const).map((v) => (
              <button key={v} type="button" onClick={() => setSettings({ ...settings, view: v })}
                className={cn(
                  "rounded px-2 py-1 text-xs capitalize transition-colors",
                  settings.view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </header>

      <ConstitutionNotice />

      <nav className="flex flex-wrap gap-1 overflow-x-auto border-b" aria-label="Optimization sections">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end}
            className={({ isActive }) => cn(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}>
            {t.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
