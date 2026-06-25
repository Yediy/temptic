import { useQuery } from "@tanstack/react-query";
import * as Sentry from "@sentry/react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/StatCard";
import { StatusBadge, type TicketStatus } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Building2, FileText, Users, CheckCircle2, XCircle, Send, Bug } from "lucide-react";
import { format } from "date-fns";

function useAdminStats() {
  return useQuery({
    queryKey: ["super-admin-stats"],
    queryFn: async () => {
      const [agenciesRes, ticketsRes, usersRes] = await Promise.all([
        supabase.from("agencies").select("id", { count: "exact", head: true }),
        supabase.from("tickets").select("id, status", { count: "exact" }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);

      const tickets = ticketsRes.data ?? [];
      const statusCounts = tickets.reduce<Record<string, number>>((acc, t) => {
        acc[t.status] = (acc[t.status] ?? 0) + 1;
        return acc;
      }, {});

      return {
        totalAgencies: agenciesRes.count ?? 0,
        totalTickets: ticketsRes.count ?? 0,
        totalUsers: usersRes.count ?? 0,
        draft: statusCounts["draft"] ?? 0,
        sent: statusCounts["sent"] ?? 0,
        signed: statusCounts["signed"] ?? 0,
        rejected: statusCounts["rejected"] ?? 0,
      };
    },
  });
}

function useRecentTickets() {
  return useQuery({
    queryKey: ["super-admin-recent-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("id, ticket_number, ticket_type, status, client_company_name_snapshot, worker_name_snapshot, total_hours, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });
}

export default function SuperAdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: recentTickets = [], isLoading: ticketsLoading } = useRecentTickets();
  const { roles } = useAuth();
  const today = format(new Date(), "EEEE, MMMM d, yyyy");
  const sentryEnabled = Boolean(import.meta.env.VITE_SENTRY_DSN);

  const triggerSentryTest = () => {
    try {
      Sentry.captureException(new Error("Sentry test error from Super Admin Dashboard"));
      toast({ title: "Sentry test error sent", description: "Check your Sentry dashboard." });
    } catch (err) {
      toast({ title: "Failed to send", description: String(err), variant: "destructive" });
    }
  };

  const triggerEdgeSentryTest = async () => {
    try {
      await supabase.functions.invoke("admin-test-sentry", { body: {} });
      toast({ title: "Edge Sentry test triggered", description: "Check your Sentry dashboard for the edge function event." });
    } catch (err) {
      // The edge function intentionally returns 500 — that's the success path.
      toast({ title: "Edge Sentry test triggered", description: "Check your Sentry dashboard for the edge function event." });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Super Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">{today}</p>
        </div>
        {roles.includes("super_admin") && sentryEnabled && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={triggerSentryTest}>
              <Bug className="mr-2 h-4 w-4" />
              Send Sentry test error
            </Button>
            <Button variant="outline" size="sm" onClick={triggerEdgeSentryTest}>
              <Bug className="mr-2 h-4 w-4" />
              Test Edge Sentry
            </Button>
          </div>
        )}
      </div>

      {/* Primary counts */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Agencies"
          value={statsLoading ? "…" : stats?.totalAgencies ?? 0}
          icon={Building2}
          variant="accent"
        />
        <StatCard
          label="Total Tickets"
          value={statsLoading ? "…" : stats?.totalTickets ?? 0}
          icon={FileText}
          variant="default"
        />
        <StatCard
          label="Total Users"
          value={statsLoading ? "…" : stats?.totalUsers ?? 0}
          icon={Users}
          variant="success"
        />
      </div>

      {/* Ticket status breakdown */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Drafts" value={statsLoading ? "…" : stats?.draft ?? 0} icon={FileText} variant="default" />
        <StatCard label="Sent / Unsigned" value={statsLoading ? "…" : stats?.sent ?? 0} icon={Send} variant="warning" />
        <StatCard label="Signed" value={statsLoading ? "…" : stats?.signed ?? 0} icon={CheckCircle2} variant="success" />
        <StatCard label="Rejected" value={statsLoading ? "…" : stats?.rejected ?? 0} icon={XCircle} variant="destructive" />
      </div>

      {/* Recent tickets across all agencies */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Recent Tickets (All Agencies)</h2>
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
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody>
                {ticketsLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Loading…</td>
                  </tr>
                ) : recentTickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No tickets in the system.</td>
                  </tr>
                ) : (
                  recentTickets.map((ticket) => (
                    <tr key={ticket.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold tracking-wider">{ticket.ticket_number}</td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-medium uppercase text-secondary-foreground">
                          {ticket.ticket_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{ticket.client_company_name_snapshot}</td>
                      <td className="px-4 py-3">{ticket.worker_name_snapshot}</td>
                      <td className="px-4 py-3 font-mono">{ticket.total_hours ?? 0}h</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={ticket.status as TicketStatus} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {format(new Date(ticket.created_at), "MMM d, yyyy")}
                      </td>
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
}
