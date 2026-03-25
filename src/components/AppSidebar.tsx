import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  FileText,
  Users,
  HardHat,
  Building2,
  Archive,
  Plus,
  Layers,
  CreditCard,
  ChevronDown,
  LogOut,
  Search,
  AlertTriangle,
  Shield,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Tickets", icon: FileText, path: "/tickets" },
  { label: "Clients", icon: Building2, path: "/clients" },
  { label: "Workers", icon: HardHat, path: "/workers" },
  { label: "PDF Archive", icon: Archive, path: "/archive" },
  { label: "Templates", icon: Layers, path: "/templates" },
  { label: "Billing", icon: CreditCard, path: "/billing" },
];

const adminItems = [
  { label: "Agencies", icon: Shield, path: "/admin/agencies" },
  { label: "Ticket Search", icon: Search, path: "/admin/tickets" },
  { label: "Notifications", icon: AlertTriangle, path: "/admin/notifications" },
];

export function AppSidebar() {
  const location = useLocation();
  const { signOut, user, roles } = useAuth();
  const isSuperAdmin = roles.includes("super_admin");

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
          <FileText className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-sidebar-accent-foreground">Temp Tic</h1>
          <p className="text-[10px] font-medium uppercase tracking-widest text-sidebar-muted">Labor Tickets</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-3 pt-4 pb-2">
        <Link
          to="/tickets/create"
          className="flex w-full items-center gap-2 rounded-lg bg-sidebar-primary px-3 py-2.5 text-sm font-semibold text-sidebar-primary-foreground transition-colors hover:bg-sidebar-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create Ticket
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 pt-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== "/" && location.pathname.startsWith(item.path));
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

        {/* Admin section — only visible to super_admin */}
        {isSuperAdmin && (
          <div className="mt-4 pt-3 border-t border-sidebar-border">
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">Super Admin</p>
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
        )}
      </nav>

      {/* User info + sign out */}
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
