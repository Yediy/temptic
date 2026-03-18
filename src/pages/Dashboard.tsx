import { Link } from "react-router-dom";
import { FileText, Send, AlertTriangle, CheckCircle2, XCircle, HardHat, Clock, Plus } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { dashboardStats, mockTickets } from "@/lib/mock-data";

export default function Dashboard() {
  const recentTickets = mockTickets.slice(0, 5);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Tuesday, March 18, 2026 — Houston South</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/tickets/create?type=weekly">
              <Plus className="mr-1 h-4 w-4" />
              Weekly Ticket
            </Link>
          </Button>
          <Button asChild>
            <Link to="/tickets/create">
              <Plus className="mr-1 h-4 w-4" />
              Daily Ticket
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Draft Tickets" value={dashboardStats.drafts} icon={FileText} variant="default" />
        <StatCard label="Unsigned" value={dashboardStats.unsigned} icon={Send} variant="warning" />
        <StatCard label="Signed Today" value={dashboardStats.signed} icon={CheckCircle2} variant="success" />
        <StatCard label="Rejected" value={dashboardStats.rejected} icon={XCircle} variant="destructive" />
      </div>

      {/* Secondary stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Workers Out" value={dashboardStats.workersOut} icon={HardHat} variant="accent" trend="Dispatched today" />
        <StatCard label="Weekly Hours" value={dashboardStats.weeklyHours} icon={Clock} variant="default" trend="This pay period" />
        <StatCard label="Sent Tickets" value={dashboardStats.sent} icon={AlertTriangle} variant="warning" trend="Awaiting client action" />
      </div>

      {/* Recent tickets */}
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
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Job</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Hours</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold tracking-wider">{ticket.ticket_number}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-medium uppercase text-secondary-foreground">
                        {ticket.ticket_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{ticket.client_name}</td>
                    <td className="px-4 py-3">{ticket.worker_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{ticket.job_title}</td>
                    <td className="px-4 py-3 font-mono">{ticket.total_hours}h</td>
                    <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
