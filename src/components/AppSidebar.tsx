import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useAllClientInvites } from "@/hooks/use-client-invites";
import { isPast } from "date-fns";
import {
  FileText, Plus, LogOut, Search, AlertTriangle, Shield, Mail, Gauge, Briefcase, Sparkles, Brain, Users2,
} from "lucide-react";
import { AGENCY_MODULES, GROUP_LABELS, type ModuleDef } from "@/lib/modules";
import { useAccessibleModules } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";

const adminItems = [
  { label: "Agencies", icon: Shield, path: "/admin/agencies" },
  { label: "Ticket Search", icon: Search, path: "/admin/tickets" },
  { label: "Notifications", icon: AlertTriangle, path: "/admin/notifications" },
  { label: "Rate Limits", icon: Gauge, path: "/admin/rate-limits" },
  { label: "WOIC Admin", icon: Brain, path: "/woic" },
  { label: "Handoff Pack", icon: Briefcase, path: "/handoff" },
];

const GROUP_ORDER: Array<NonNullable<ModuleDef["group"]>> = ["workforce", "operations", "finance", "insights", "admin"];

export function AppSidebar() {
  const location = useLocation();
  const { signOut, user, roles } = useAuth();
  const isSuperAdmin = roles.includes("super_admin");
  const { accessibleAgencyModules } = useAccessibleModules();

  const { data: invites = [] } = useAllClientInvites();
  const pendingCount = invites.filter(
    (i) => i.status === "pending" && !isPast(new Date(i.expires_at))
  ).length;

  const grouped = GROUP_ORDER.map((g) => ({
    group: g,
    items: accessibleAgencyModules.filter((m) => m.group === g),
  })).filter((s) => s.items.length > 0);

  const isActivePath = (path: string) =>
    location.pathname === path || (path !== "/" && location.pathname.startsWith(path));

  return (
    <aside className="fixed left-0 top-0 z-40 hidden md:flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
          <FileText className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-sidebar-accent-foreground">Temp Tic</h1>
          <p className="text-[10px] font-medium uppercase tracking-widest text-sidebar-muted">Workforce OS</p>
        </div>
      </div>

      <div className="px-3 pt-4 pb-2">
        <Link
          to="/tickets/create"
          className="flex w-full items-center gap-2 rounded-lg bg-sidebar-primary px-3 py-2.5 text-sm font-semibold text-sidebar-primary-foreground transition-colors hover:bg-sidebar-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create Ticket
        </Link>
      </div>

      <nav className="flex-1 space-y-3 overflow-y-auto px-3 pt-2 pb-4">
        {grouped.map((section) => (
          <div key={section.group}>
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">
              {GROUP_LABELS[section.group]}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActivePath(item.path);
                const showInviteBadge = item.key === "onboarding" && pendingCount > 0;
                return (
                  <Link
                    key={item.key}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.status !== "live" && (
                      <Badge variant="outline" className="border-sidebar-border bg-transparent text-[9px] text-sidebar-muted h-4 px-1">
                        <Sparkles className="w-2.5 h-2.5 mr-0.5" /> soon
                      </Badge>
                    )}
                    {showInviteBadge && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                        {pendingCount > 99 ? "99+" : pendingCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <div>
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">Legacy tools</p>
          <div className="space-y-0.5">
            <Link to="/invites" className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors", isActivePath("/invites") ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50")}>
              <Mail className="h-4 w-4" /><span className="flex-1">Pending Invites</span>
              {pendingCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">{pendingCount}</span>
              )}
            </Link>
            <Link to="/archive" className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors", isActivePath("/archive") ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50")}>
              <FileText className="h-4 w-4" /><span className="flex-1">PDF Archive</span>
            </Link>
            <Link to="/templates" className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors", isActivePath("/templates") ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50")}>
              <FileText className="h-4 w-4" /><span className="flex-1">Templates</span>
            </Link>
            <Link to="/help" className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors", isActivePath("/help") ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50")}>
              <FileText className="h-4 w-4" /><span className="flex-1">Help</span>
            </Link>
            <Link to="/security" className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors", isActivePath("/security") ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50")}>
              <Shield className="h-4 w-4" /><span className="flex-1">Security</span>
            </Link>
          </div>
        </div>

        {isSuperAdmin && (
          <div className="pt-2 border-t border-sidebar-border">
            <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">Super Admin</p>
            <div className="space-y-0.5">
              {adminItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-bold text-sidebar-accent-foreground">
            {user?.email?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-sidebar-accent-foreground">{user?.email ?? "Agency"}</p>
            <p className="text-xs text-sidebar-muted">Agency Portal</p>
          </div>
          <button onClick={signOut} className="rounded-lg p-1.5 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
