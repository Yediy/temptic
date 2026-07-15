import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Brain } from "lucide-react";

const tabs = [
  { to: "/woic/identity", label: "Identity" },
  { to: "/woic/knowledge", label: "Knowledge" },
  { to: "/woic/decisions", label: "Decisions" },
  { to: "/woic/recommendations", label: "Recommendations" },
  { to: "/woic/predictions", label: "Predictions" },
  { to: "/woic/learning", label: "Learning" },
  { to: "/woic/compliance", label: "Compliance" },
  { to: "/woic/context", label: "Context Monitor" },
  { to: "/woic/registry", label: "Service Registry" },
];

export default function WoicLayout() {
  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">WOIC Administration</h1>
          <p className="text-sm text-muted-foreground">
            Workforce Operational Intelligence Core
          </p>
        </div>
      </header>

      <nav className="flex flex-wrap gap-1 border-b">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              cn(
                "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <div>
        <Outlet />
      </div>
    </div>
  );
}
