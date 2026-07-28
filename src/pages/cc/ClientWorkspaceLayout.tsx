import { Outlet, NavLink, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Briefcase, UserCheck, ClipboardCheck, FileText, MessageSquare,
  BarChart3, Sparkles, HelpCircle, Calendar as CalendarIcon, Users, Bell, Building2, KeyRound,
} from "lucide-react";

const tabs = [
  { to: "", label: "Command Center", icon: LayoutDashboard, end: true },
  { to: "orders", label: "Job Orders", icon: Briefcase },
  { to: "candidates", label: "Candidates", icon: UserCheck },
  { to: "approvals", label: "Approvals", icon: ClipboardCheck },
  { to: "documents", label: "Documents", icon: FileText },
  { to: "communication", label: "Messages", icon: MessageSquare },
  { to: "requests", label: "Requests", icon: HelpCircle },
  { to: "analytics", label: "Analytics", icon: BarChart3 },
  { to: "advisor", label: "WOIC Advisor", icon: Sparkles },
  { to: "calendar", label: "Calendar", icon: CalendarIcon },
  { to: "notifications", label: "Notifications", icon: Bell },
  { to: "executive", label: "Executive", icon: Building2 },
  { to: "permissions", label: "Permissions", icon: Users },
  { to: "api", label: "API", icon: KeyRound },
];

export default function ClientWorkspaceLayout() {
  const { clientId } = useParams();
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="mx-auto max-w-7xl px-4 lg:px-8 pt-6 pb-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Client Collaboration</p>
          <h1 className="text-2xl font-bold tracking-tight">Workspace</h1>
        </div>
        <nav className="mx-auto max-w-7xl px-2 lg:px-6 overflow-x-auto">
          <div className="flex gap-1 pb-2">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) => cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                  isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
      <main className="mx-auto max-w-7xl p-4 lg:p-8">
        {!clientId ? (
          <p className="text-sm text-muted-foreground">Select a client to open the workspace.</p>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
