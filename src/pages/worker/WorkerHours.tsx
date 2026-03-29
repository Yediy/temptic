import { useWorkerTickets, useWorkerHoursSummary } from "@/hooks/use-worker-data";

export default function WorkerHours() {
  const { data: tickets } = useWorkerTickets();
  const { data: stats } = useWorkerHoursSummary();
  const signed = tickets?.filter(t => t.status === "signed") ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">My Hours</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">This Week</p>
          <p className="mt-1 text-3xl font-bold">{stats?.thisWeekHours ?? 0}h</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">All Time</p>
          <p className="mt-1 text-3xl font-bold">{stats?.totalHours ?? 0}h</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Client</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Job</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Hours</th>
              </tr>
            </thead>
            <tbody>
              {signed.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">No approved hours yet.</td></tr>
              ) : (
                signed.map(t => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{t.work_date || t.week_start_date || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                        {t.client_initials}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{t.job_title || "—"}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{t.total_hours ?? 0}h</td>
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
