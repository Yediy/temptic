import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Globe2,
  UserRound,
  Building2,
  FolderKanban,
  ClipboardList,
  UserSearch,
  ShieldCheck,
  Wallet,
  MessagesSquare,
  Brain,
  Workflow,
  Boxes,
  Search,
  Bookmark,
  Settings2,
} from "lucide-react";

const tabs = [
  { to: "/timeline", end: true, label: "Global Timeline", icon: Globe2 },
  { to: "/timeline/worker", label: "Worker Timeline", icon: UserRound },
  { to: "/timeline/organization", label: "Organization Timeline", icon: Building2 },
  { to: "/timeline/project", label: "Project Timeline", icon: FolderKanban },
  { to: "/timeline/assignment", label: "Assignment Timeline", icon: ClipboardList },
  { to: "/timeline/recruiting", label: "Recruiting Timeline", icon: UserSearch },
  { to: "/timeline/compliance", label: "Compliance Timeline", icon: ShieldCheck },
  { to: "/timeline/payroll", label: "Payroll Timeline", icon: Wallet },
  { to: "/timeline/communication", label: "Communication Timeline", icon: MessagesSquare },
  { to: "/timeline/ai", label: "AI Timeline", icon: Brain },
  { to: "/timeline/automation", label: "Automation Timeline", icon: Workflow },
  { to: "/timeline/twin", label: "Digital Twin Timeline", icon: Boxes },
  { to: "/timeline/explorer", label: "Event Explorer", icon: Search },
  { to: "/timeline/views", label: "Saved Views", icon: Bookmark },
  { to: "/timeline/settings", label: "Timeline Settings", icon: Settings2 },
];

export default function TimelineLayout() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">IWOS Phase 5.4B</p>
        <h1 className="text-3xl font-semibold tracking-tight">Universal Timeline Workspace</h1>
        <p className="text-sm text-muted-foreground">
          The historical memory of IWOS — every entity's complete history, served by the Universal Timeline Engine.
        </p>
      </header>

      <nav aria-label="Timeline sections" className="flex flex-wrap gap-1 border-b">
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
