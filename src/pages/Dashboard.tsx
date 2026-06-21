import React from "react";
import { Link } from "react-router-dom";
import { FileText, Send, CheckCircle2, XCircle, Clock, Plus, HardHat, Building2, CalendarPlus, Timer, Zap, TurtleIcon, CalendarDays, TrendingUp, DollarSign, PercentIcon, Trophy } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { StatusBadge, type TicketStatus } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStats, useTickets, useDashboardAnalytics } from "@/hooks/use-agency-data";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import SuperAdminDashboard from "@/pages/admin/SuperAdminDashboard";

function formatDuration(hours: number | null | undefined): string {
  if (hours == null || !isFinite(hours)) return "—";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

const Dashboard = React.forwardRef<HTMLDivElement, object>(function Dashboard(_props, ref) {
  const { data: stats } = useDashboardStats();
  const { data: tickets } = useTickets();
  const { data: analytics, isLoading: analyticsLoading } = useDashboardAnalytics();
  const { user, roles } = useAuth();

  if (roles.includes("super_admin")) {
    return <SuperAdminDashboard />;
  }

  const recentTickets = (tickets ?? []).slice(0, 5);
  const today = format(new Date(), "EEEE, MMMM d, yyyy");

  return (
    <div ref={ref} className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{today}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/tickets/create/weekly">
              <Plus className="mr-1 h-4 w-4" /> Weekly Ticket
            </Link>
          </Button>
          <Button asChild>
            <Link to="/tickets/create">
              <Plus className="mr-1 h-4 w-4" /> Daily Ticket
            </Link>
          </Button>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">This Month</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Created" value={stats?.createdThisMonth ?? 0} icon={CalendarPlus} variant="accent" />
          <StatCard label="Pending Approvals" value={stats?.pendingApprovals ?? 0} icon={Send} variant="warning" />
          <StatCard label="Signed" value={stats?.signedThisMonth ?? 0} icon={CheckCircle2} variant="success" />
          <StatCard label="Rejected" value={stats?.rejectedThisMonth ?? 0} icon={XCircle} variant="destructive" />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Draft Tickets" value={stats?.drafts ?? 0} icon={FileText} variant="default" />
          <StatCard label="Active Workers" value={stats?.activeWorkers ?? 0} icon={HardHat} variant="default" />
          <StatCard label="Active Clients" value={stats?.activeClients ?? 0} icon={Building2} variant="default" />
          <StatCard label="Total Hours" value={stats?.totalHours ?? 0} icon={Clock} variant="default" trend="All tickets" />
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Tickets</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/tickets">View all</Link>
          </Button>
        </div>
        <div className="rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Ticket #</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Client</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Worker</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Hours</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTickets.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No tickets yet. Create your first ticket to get started.</td></tr>
                ) : (
                  recentTickets.map(ticket => (
                    <tr key={ticket.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold tracking-wider">{ticket.ticket_number}</td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-medium uppercase text-secondary-foreground">{ticket.ticket_type}</span>
                      </td>
                      <td className="px-4 py-3 font-medium">{ticket.client_company_name_snapshot}</td>
                      <td className="px-4 py-3">{ticket.worker_name_snapshot}</td>
                      <td className="px-4 py-3 font-mono">{ticket.total_hours ?? 0}h</td>
                      <td className="px-4 py-3"><StatusBadge status={ticket.status as TicketStatus} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
});

Dashboard.displayName = "Dashboard";

export default Dashboard;
