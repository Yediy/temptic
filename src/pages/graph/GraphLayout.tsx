import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Share2 } from "lucide-react";

const tabs = [
  { to: "/graph/overview", label: "Platform Overview" },
  { to: "/graph/domain/organization", label: "Organization" },
  { to: "/graph/domain/worker", label: "Worker" },
  { to: "/graph/domain/project", label: "Project" },
  { to: "/graph/domain/knowledge", label: "Knowledge" },
  { to: "/graph/domain/automation", label: "Automation" },
  { to: "/graph/domain/communication", label: "Communication" },
  { to: "/graph/domain/timeline", label: "Timeline" },
  { to: "/graph/domain/ai", label: "AI Agent" },
  { to: "/graph/domain/platform", label: "Platform Domain" },
  { to: "/graph/dependencies", label: "Dependency" },
  { to: "/graph/impact", label: "Impact Analysis" },
  { to: "/graph/search", label: "Graph Search" },
  { to: "/graph/views", label: "Saved Views" },
  { to: "/graph/settings", label: "Settings" },
  { to: "/graph/explorer", label: "Classic Explorer" },
  { to: "/graph/intelligence", label: "Graph Intelligence" },
  { to: "/graph/paths", label: "Paths & Similarity" },
  { to: "/graph/taxonomy", label: "Taxonomy" },
];

export default function GraphLayout() {
  return (
    <div className="space-y-4 p-6">
      <header className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Share2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Graph Explorer</h1>
          <p className="text-sm text-muted-foreground">
            Every Platform Organism, every relationship — powered by the Platform Graph Intelligence APIs.
          </p>
        </div>
      </header>

      <nav className="flex flex-wrap gap-1 border-b">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end
            className={({ isActive }) =>
              cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
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
