import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Activity, Bot, CheckSquare, FileCode, Filter, Gauge, LayoutDashboard, Library,
  ListChecks, Settings, Skull, Sparkles, Workflow, Zap,
} from "lucide-react";

const tabs = [
  { to: "/automation", end: true, label: "Dashboard", icon: LayoutDashboard },
  { to: "/automation/workflow", label: "Workflow Builder", icon: Workflow },
  { to: "/automation/builder", label: "Rule Builder", icon: FileCode },
  { to: "/automation/templates", label: "Automation Library", icon: Library },
  { to: "/automation/logs", label: "Execution History", icon: ListChecks },
  { to: "/automation/monitor", label: "Live Monitor", icon: Activity },
  { to: "/automation/triggers", label: "Triggers", icon: Zap },
  { to: "/automation/actions", label: "Actions", icon: Sparkles },
  { to: "/automation/conditions", label: "Conditions", icon: Filter },
  { to: "/automation/approvals", label: "Approvals", icon: CheckSquare },
  { to: "/automation/agents", label: "AI Automation", icon: Bot },
  { to: "/automation/testing", label: "Testing", icon: CheckSquare },
  { to: "/automation/analytics", label: "Analytics", icon: Gauge },
  { to: "/automation/dead-letter", label: "Dead Letter", icon: Skull },
  { to: "/automation/settings", label: "Settings", icon: Settings },
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
