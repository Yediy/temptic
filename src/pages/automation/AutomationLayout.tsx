import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Activity, Bot, FileCode, Gauge, LayoutDashboard, Library, ListChecks, Skull } from "lucide-react";

const tabs = [
  { to: "/automation", end: true, label: "Dashboard", icon: LayoutDashboard },
  { to: "/automation/builder", label: "Rule Builder", icon: FileCode },
  { to: "/automation/monitor", label: "Live Monitor", icon: Activity },
  { to: "/automation/templates", label: "Templates", icon: Library },
  { to: "/automation/agents", label: "AI Agents", icon: Bot },
  { to: "/automation/logs", label: "Logs", icon: ListChecks },
  { to: "/automation/dead-letter", label: "Dead Letter", icon: Skull },
  { to: "/automation/analytics", label: "Analytics", icon: Gauge },
];

export default function AutomationLayout() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">IWOS Phase 4.8</p>
        <h1 className="text-3xl font-semibold tracking-tight">Automation Studio</h1>
        <p className="text-sm text-muted-foreground">
          Autonomous execution engine — event bus, rule engine, AI agents, and live monitoring.
        </p>
      </header>

      <nav className="flex flex-wrap gap-1 border-b">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-t-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "border-b-2 border-primary bg-muted/30 font-semibold text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )
            }
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
