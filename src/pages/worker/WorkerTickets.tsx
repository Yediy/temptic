export default function WorkerTickets() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Tickets</h1>
        <p className="text-sm text-muted-foreground">View your assigned tickets and approved hours.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">This Week</p>
          <p className="mt-1 text-3xl font-bold">0 hrs</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Signed Tickets</p>
          <p className="mt-1 text-3xl font-bold">0</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <p className="text-sm text-muted-foreground">No tickets assigned yet.</p>
      </div>
    </div>
  );
}
