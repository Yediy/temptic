export default function ClientHistory() {
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">Ticket History</h1>
      <div className="rounded-xl border bg-card p-6">
        <p className="text-sm text-muted-foreground">No signed or rejected tickets yet.</p>
      </div>
    </div>
  );
}
