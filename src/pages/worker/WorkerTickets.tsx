import { useWorkerTickets, useWorkerHoursSummary } from "@/hooks/use-worker-data";
import { StatusBadge, type TicketStatus } from "@/components/StatusBadge";

export default function WorkerTickets() {
  const { data: tickets, isLoading } = useWorkerTickets();
  const { data: stats } = useWorkerHoursSummary();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Tickets</h1>
        <p className="text-sm text-muted-foreground">View your assigned tickets and approved hours.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">This Week</p>
          <p className="mt-1 text-3xl font-bold">{stats?.thisWeekHours ?? 0}h</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Total Hours</p>
          <p className="mt-1 text-3xl font-bold">{stats?.totalHours ?? 0}h</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Signed Tickets</p>
          <p className="mt-1 text-3xl font-bold">{stats?.totalSignedTickets ?? 0}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="mt-1 text-3xl font-bold">{stats?.pendingTickets ?? 0}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Ticket #</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Client</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Job</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Hours</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Loading…</td></tr>
              ) : !tickets?.length ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No tickets assigned yet.</td></tr>
              ) : (
                tickets.map(t => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold tracking-wider">{t.ticket_number}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t.work_date || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                        {t.client_initials}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{t.job_title || "—"}</td>
                    <td className="px-4 py-3 font-mono font-semibold">{t.total_hours ?? 0}h</td>
                    <td className="px-4 py-3"><StatusBadge status={t.status as TicketStatus} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
