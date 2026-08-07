import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Home, Search, BookOpen, Scale, ListChecks, Gavel, GraduationCap, BadgeCheck,
  FileText, Sparkles, Network, Layers, CheckCircle2, BarChart3, Settings2,
} from "lucide-react";

const tabs = [
  { to: "/knowledge", end: true, label: "Home", icon: Home },
  { to: "/knowledge/search", label: "Search", icon: Search },
  { to: "/knowledge/base", label: "Knowledge Base", icon: BookOpen },
  { to: "/knowledge/policies", label: "Policies", icon: Scale },
  { to: "/knowledge/sops", label: "SOPs", icon: ListChecks },
  { to: "/knowledge/regulations", label: "Regulations", icon: Gavel },
  { to: "/knowledge/training", label: "Training", icon: GraduationCap },
  { to: "/knowledge/certifications", label: "Certifications", icon: BadgeCheck },
  { to: "/knowledge/documents", label: "Documents", icon: FileText },
  { to: "/knowledge/insights", label: "AI Insights", icon: Sparkles },
  { to: "/knowledge/graph", label: "Knowledge Graph", icon: Network },
  { to: "/knowledge/collections", label: "Collections", icon: Layers },
  { to: "/knowledge/approvals", label: "Approvals", icon: CheckCircle2 },
  { to: "/knowledge/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/knowledge/settings", label: "Settings", icon: Settings2 },
];

export default function KnowledgeLayout() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">IWOS Phase 5.5B</p>
        <h1 className="text-3xl font-semibold tracking-tight">Knowledge Workspace</h1>
        <p className="text-sm text-muted-foreground">
          A semantic knowledge environment powered by the Knowledge Intelligence Engine and the WOIC cognitive core.
        </p>
      </header>

      <nav aria-label="Knowledge sections" className="flex flex-wrap gap-1 border-b">
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
