import { NavLink, Outlet } from "react-router-dom";
import { Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContractChips } from "@/components/cognition/CogBits";
import { useCognitionPermissions, useCognitionSettings } from "@/hooks/cognition/use-cognition";
import { WORKSPACE_MODES } from "@/lib/cognition/platform";

const tabs = [
  { to: "/cognition", label: "Cognitive Overview", end: true },
  { to: "/cognition/sessions", label: "Active Sessions" },
  { to: "/cognition/requests", label: "Cognitive Requests" },
  { to: "/cognition/faculties", label: "Faculty Registry" },
  { to: "/cognition/evidence", label: "Evidence Explorer" },
  { to: "/cognition/claims", label: "Claims" },
  { to: "/cognition/contradictions", label: "Contradictions" },
  { to: "/cognition/uncertainty", label: "Uncertainty" },
  { to: "/cognition/models", label: "Model Operations" },
  { to: "/cognition/budgets", label: "Cognitive Budgets" },
  { to: "/cognition/escalations", label: "Escalations" },
  { to: "/cognition/performance", label: "Performance" },
  { to: "/cognition/architecture", label: "Architecture" },
  { to: "/cognition/settings", label: "Settings" },
];

export default function CognitionLayout() {
  const [settings, setSettings] = useCognitionSettings();
  const { canEngineering } = useCognitionPermissions();

  return (
    <div className="space-y-4 p-4 md:p-6">
      <header className="flex flex-wrap items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Cpu className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">WOIC Intelligence</h1>
          <p className="text-sm text-muted-foreground">
            Cognitive control and observability — what WOIC is processing, on what evidence, at what cost, and
            where a human is required.
          </p>
        </div>
        <div className="flex rounded-md border p-0.5" role="group" aria-label="Workspace mode">
          {WORKSPACE_MODES.filter((m) => m.key !== "engineering" || canEngineering).map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setSettings({ ...settings, mode: m.key })}
              className={cn(
                "rounded px-2 py-1 text-xs transition-colors",
                settings.mode === m.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-xs text-muted-foreground">
        <p>
          All cognition is performed by the WOIC Cognitive Core (Phase 6.0A). This workspace observes and controls;
          it performs no reasoning, memory, model routing or evidence evaluation, and never displays private
          chain-of-thought.
        </p>
        <ContractChips />
      </div>

      <nav className="flex flex-wrap gap-1 overflow-x-auto border-b" aria-label="WOIC Intelligence sections">
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
