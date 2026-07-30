import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Activity, LayoutDashboard, Radar, ShieldAlert, Crown } from "lucide-react";

const tabs = [
  { to: "/oic", end: true, label: "Mission Control", icon: LayoutDashboard },
  { to: "/oic/health", label: "Organization Health", icon: Radar },
  { to: "/oic/stream", label: "Live Event Stream", icon: Activity },
  { to: "/oic/risk", label: "Risk Center", icon: ShieldAlert },
  { to: "/oic/executive", label: "Executive Overview", icon: Crown },
];

export default function OicLayout() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">IWOS Phase 4.9</p>
        <h1 className="text-3xl font-semibold tracking-tight">Operational Intelligence Center</h1>
        <p className="text-sm text-muted-foreground">
          Live command environment — organization health, risk, events, and executive intelligence powered by WOIC.
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
