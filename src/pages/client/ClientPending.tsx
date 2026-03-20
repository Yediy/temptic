export default function ClientPending() {
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">Pending Tickets</h1>
      <div className="rounded-xl border bg-card p-6">
        <p className="text-sm text-muted-foreground">No tickets awaiting your signature.</p>
      </div>
    </div>
  );
}
