export default function ClientApiKeys() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Client API</h2>
      <div className="rounded-xl border bg-card p-6 space-y-2">
        <p className="text-sm">Programmatic access to your workspace is available through the IWOS API.</p>
        <p className="text-xs text-muted-foreground">
          Supported integrations: ERP, HRIS, Payroll, Scheduling, Procurement, and Identity Providers.
          Contact your agency administrator to provision API credentials scoped to this client workspace.
        </p>
      </div>
    </div>
  );
}
