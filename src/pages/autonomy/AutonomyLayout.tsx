import { NavLink, Outlet } from "react-router-dom";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContractChips } from "@/components/autonomy/AutoBits";
import { useAutonomyPermissions, useAutonomySettings } from "@/hooks/autonomy/use-autonomy";
import { WORKSPACE_MODES } from "@/lib/autonomy/platform";

const tabs = [
  { to: "/autonomy", label: "Overview", end: true },
  { to: "/autonomy/coordinations", label: "Live Coordinations" },
  { to: "/autonomy/objectives", label: "Objectives" },
  { to: "/autonomy/plans", label: "Plans" },
  { to: "/autonomy/tasks", label: "Tasks" },
  { to: "/autonomy/actors", label: "Actors" },
  { to: "/autonomy/authority", label: "Authority Center" },
  { to: "/autonomy/approvals", label: "Approval Queue" },
  { to: "/autonomy/intervention", label: "Intervention Center" },
  { to: "/autonomy/escalations", label: "Escalations" },
  { to: "/autonomy/ledger", label: "Autonomy Ledger" },
  { to: "/autonomy/performance", label: "Performance" },
  { to: "/autonomy/incidents", label: "Incidents" },
  { to: "/autonomy/settings", label: "Settings" },
];

export default function AutonomyLayout() {
  const [settings, setSettings] = useAutonomySettings();
  const { canEngineering } = useAutonomyPermissions();

  return (
    <div className="space-y-4 p-4 md:p-6">
      <header className="flex flex-wrap items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Autonomous Operations</h1>
          <p className="text-sm text-muted-foreground">
            The human control plane for autonomous IWOS activity — observe, approve, control, interrupt and audit.
          </p>
        </div>
        <div className="flex rounded-md border p-0.5" role="group" aria-label="Workspace mode">
          {WORKSPACE_MODES.filter((m) => m.key !== "engineering" || canEngineering).map((m) => (
            <button key={m.key} type="button" onClick={() => setSettings({ ...settings, mode: m.key })}
              className={cn(
                "rounded px-2 py-1 text-xs transition-colors",
                settings.mode === m.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}>
              {m.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-xs text-muted-foreground">
        <p>
          All coordination, authority and execution decisions are made by the Autonomous Coordination Engine.
          This workspace issues governed requests only — it never performs autonomous action itself.
        </p>
        <ContractChips />
      </div>

      <nav className="flex flex-wrap gap-1 overflow-x-auto border-b" aria-label="Autonomous Operations sections">
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
