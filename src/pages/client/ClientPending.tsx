import { Link } from "react-router-dom";
import { useClientTickets } from "@/hooks/use-client-data";
import { StatusBadge, type TicketStatus } from "@/components/StatusBadge";

export default function ClientPending() {
  const { data: tickets, isLoading } = useClientTickets();
  const pending = tickets?.filter(t => ["sent", "viewed"].includes(t.status)) ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">Pending Tickets</h1>

      <div className="rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Ticket #</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Worker</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Job</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Loading…</td></tr>
              ) : pending.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No tickets awaiting your signature.</td></tr>
              ) : (
                pending.map(t => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold tracking-wider">{t.ticket_number}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t.work_date || "—"}</td>
                    <td className="px-4 py-3">{t.worker_name_snapshot}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t.job_title || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={t.status as TicketStatus} /></td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/client/ticket/${t.id}`} className="text-sm font-medium text-primary hover:underline">
                        Review & Sign
                      </Link>
                    </td>
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
