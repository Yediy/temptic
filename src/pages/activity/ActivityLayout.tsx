import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Activity,
  Search,
  Clock,
  Repeat,
  HeartPulse,
  Bell,
  Brain,
  Building2,
  UserRound,
  ShieldCheck,
} from "lucide-react";

const tabs = [
  { to: "/activity", end: true, label: "Live Events", icon: Activity },
  { to: "/activity/explorer", label: "Event Explorer", icon: Search },
  { to: "/activity/timeline", label: "Event Timeline", icon: Clock },
  { to: "/activity/replay", label: "Event Replay", icon: Repeat },
  { to: "/activity/health", label: "System Health", icon: HeartPulse },
  { to: "/activity/notifications", label: "Notifications", icon: Bell },
  { to: "/activity/ai", label: "AI Activity", icon: Brain },
  { to: "/activity/organizations", label: "Organization Activity", icon: Building2 },
  { to: "/activity/workers", label: "Worker Activity", icon: UserRound },
  { to: "/activity/audit", label: "Audit History", icon: ShieldCheck },
];

export default function ActivityLayout() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">IWOS Phase 5.1B</p>
        <h1 className="text-3xl font-semibold tracking-tight">System Activity Center</h1>
        <p className="text-sm text-muted-foreground">
          Universal Event Fabric — every operational signal across IWOS, searchable, explainable, and replayable.
        </p>
      </header>

      <nav aria-label="Activity Center sections" className="flex flex-wrap gap-1 border-b">
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
