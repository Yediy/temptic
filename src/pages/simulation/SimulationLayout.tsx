import { NavLink, Outlet } from "react-router-dom";
import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSimSettings, useSimulationRuns } from "@/hooks/simulation/use-simulation";
import { SimulationBanner } from "@/components/simulation/SimBits";

const tabs = [
  { to: "/simulation", label: "Home", end: true },
  { to: "/simulation/builder", label: "Scenario Builder" },
  { to: "/simulation/library", label: "Scenario Library" },
  { to: "/simulation/compare", label: "Compare" },
  { to: "/simulation/runs", label: "Live Runs" },
  { to: "/simulation/history", label: "History" },
  { to: "/simulation/timeline", label: "Projected Timeline" },
  { to: "/simulation/impact", label: "Impact Map" },
  { to: "/simulation/risk", label: "Risk Explorer" },
  { to: "/simulation/assumptions", label: "Assumptions" },
  { to: "/simulation/calibration", label: "Calibration" },
  { to: "/simulation/saved", label: "Saved" },
  { to: "/simulation/settings", label: "Settings" },
];

export default function SimulationLayout() {
  const [settings, setSettings] = useSimSettings();
  const runs = useSimulationRuns();
  const active = runs.filter((r) => r.status === "running").length;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <header className="flex flex-wrap items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <FlaskConical className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Platform Simulation Workspace</h1>
          <p className="text-sm text-muted-foreground">
            Explore possible futures — powered by the Platform Simulation Engine. Production reality is never touched.
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
              <button
                key={v}
                type="button"
                onClick={() => setSettings({ ...settings, view: v })}
                className={cn(
                  "rounded px-2 py-1 text-xs capitalize transition-colors",
                  settings.view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </header>

      <SimulationBanner />

      <nav className="flex flex-wrap gap-1 overflow-x-auto border-b">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              cn(
                "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
