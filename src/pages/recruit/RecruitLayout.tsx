import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Users, Store, Briefcase, Building2, Kanban, CalendarClock, ClipboardCheck, LineChart, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/recruit", end: true, label: "Dashboard", icon: LayoutDashboard },
  { to: "/recruit/candidates", label: "Candidates", icon: Users },
  { to: "/recruit/marketplace", label: "Marketplace", icon: Store },
  { to: "/recruit/jobs", label: "Job Orders", icon: Briefcase },
  { to: "/recruit/clients", label: "Clients", icon: Building2 },
  { to: "/recruit/pipeline", label: "Pipeline", icon: Kanban },
  { to: "/recruit/interviews", label: "Interviews", icon: CalendarClock },
  { to: "/recruit/placements", label: "Placements", icon: ClipboardCheck },
  { to: "/recruit/analytics", label: "Analytics", icon: LineChart },
  { to: "/recruit/assistant", label: "AI Recruiter", icon: Sparkles },
];

export default function RecruitLayout() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Temptic Recruit OS</h1>
        <p className="text-sm text-muted-foreground">
          Staffing operating profile powered by IWOS · WOIC intelligence · TTOS workflows
        </p>
      </div>
      <nav className="flex flex-wrap gap-1 border-b pb-2">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )
            }
          >
            <it.icon className="h-4 w-4" />
            {it.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
