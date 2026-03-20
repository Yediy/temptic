import { useAuth } from "@/lib/auth";

export default function ClientDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Client Dashboard</h1>
        <p className="text-sm text-muted-foreground">Review and sign pending labor tickets.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Awaiting Signature</p>
          <p className="mt-1 text-3xl font-bold">0</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Signed This Week</p>
          <p className="mt-1 text-3xl font-bold">0</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Rejected</p>
          <p className="mt-1 text-3xl font-bold">0</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <p className="text-sm text-muted-foreground">No pending tickets. Check back soon.</p>
      </div>
    </div>
  );
}
