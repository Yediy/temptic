import { Link } from "react-router-dom";
import { useClientDashboardStats, useClientTickets } from "@/hooks/use-client-data";
import { StatusBadge, type TicketStatus } from "@/components/StatusBadge";

export default function ClientDashboard() {
  const { data: stats } = useClientDashboardStats();
  const { data: tickets } = useClientTickets();
  const pending = tickets?.filter(t => ["sent", "viewed"].includes(t.status)).slice(0, 5) ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Client Dashboard</h1>
        <p className="text-sm text-muted-foreground">Review and sign pending labor tickets.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <p className="text-sm text-muted-foreground">Awaiting Signature</p>
          <p className="mt-1 text-3xl font-bold text-destructive">{stats?.pending ?? 0}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Signed This Week</p>
          <p className="mt-1 text-3xl font-bold">{stats?.signedThisWeek ?? 0}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Rejected</p>
          <p className="mt-1 text-3xl font-bold">{stats?.rejected ?? 0}</p>
        </div>
      </div>

      {pending.length > 0 ? (
        <div className="rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Tickets Awaiting Signature</h3>
          </div>
          <div className="divide-y">
            {pending.map(t => (
              <Link key={t.id} to={`/client/ticket/${t.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                <div>
                  <p className="font-mono text-xs font-semibold tracking-wider">{t.ticket_number}</p>
                  <p className="text-sm text-muted-foreground">{t.worker_name_snapshot} · {t.work_date || "No date"}</p>
                </div>
                <StatusBadge status={t.status as TicketStatus} />
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">No pending tickets. Check back soon.</p>
        </div>
      )}
    </div>
  );
}
