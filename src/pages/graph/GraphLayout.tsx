import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Share2 } from "lucide-react";

const tabs = [
  { to: "/graph/explorer", label: "Explorer" },
  { to: "/graph/intelligence", label: "Graph Intelligence" },
  { to: "/graph/paths", label: "Paths & Similarity" },
  { to: "/graph/taxonomy", label: "Taxonomy" },
];

export default function GraphLayout() {
  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Share2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workforce Graph</h1>
          <p className="text-sm text-muted-foreground">
            The relationship engine underneath IWOS — every entity is a node, every interaction an edge.
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
