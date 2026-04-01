import { CheckCircle2, XCircle, AlertTriangle, ExternalLink } from "lucide-react";

interface CheckItem {
  category: string;
  items: { label: string; path?: string; notes?: string }[];
}

const qaChecklist: CheckItem[] = [
  {
    category: "Agency Portal",
    items: [
      { label: "Login with agency credentials", path: "/login" },
      { label: "Dashboard loads with stats", path: "/" },
      { label: "Create client company", path: "/clients" },
      { label: "Add work site to client", path: "/clients" },
      { label: "Add authorized signer with email", path: "/clients" },
      { label: "Send invite to signer", path: "/clients" },
      { label: "See pending invite state on client card", path: "/clients" },
      { label: "See pending invites dashboard", path: "/invites" },
      { label: "Add worker", path: "/workers" },
      { label: "Create daily ticket (5-step wizard)", path: "/tickets/create" },
      { label: "Create weekly ticket", path: "/tickets/create/weekly" },
      { label: "View ticket detail with timeline", path: "/tickets" },
      { label: "Send ticket for signature", path: "/tickets" },
      { label: "Edit rejected/corrected ticket", notes: "Navigate from ticket detail" },
      { label: "Signer readiness warnings on ticket review step", path: "/tickets/create" },
      { label: "Archive filters and CSV export", path: "/archive" },
      { label: "Templates upload and field mappings", path: "/templates" },
      { label: "Template activation blocked without required fields", path: "/templates" },
    ],
  },
  {
    category: "Client Portal",
    items: [
      { label: "Accept invite via onboarding link", path: "/client/onboarding/:token" },
      { label: "Login with client credentials", path: "/client/login" },
      { label: "Dashboard shows pending ticket count", path: "/client" },
      { label: "View pending tickets list", path: "/client/pending" },
      { label: "Review and sign daily ticket", notes: "Verify name, initials, signature pad" },
      { label: "Review and sign weekly ticket", notes: "Verify weekly hours table displayed" },
      { label: "Reject ticket with reason", notes: "Verify rejection reason required" },
      { label: "View ticket history", path: "/client/history" },
      { label: "Already-signed tickets show non-editable state" },
    ],
  },
  {
    category: "Worker Portal",
    items: [
      { label: "Login with worker credentials", path: "/worker/login" },
      { label: "View assigned tickets only", path: "/worker" },
      { label: "Hours summary shows this week and total", path: "/worker/hours" },
      { label: "Client column shows initials only (not full name)" },
      { label: "No access to client signature images" },
      { label: "No access to billing rates or agency notes" },
    ],
  },
  {
    category: "Admin (super_admin only)",
    items: [
      { label: "Admin routes blocked for non-super_admin", path: "/admin/agencies" },
      { label: "Agencies page loads", path: "/admin/agencies" },
      { label: "Ticket search works", path: "/admin/tickets" },
      { label: "Notification issues page shows failed/queued", path: "/admin/notifications" },
    ],
  },
  {
    category: "External Integrations (may require setup)",
    items: [
      { label: "PDF draft generated on ticket create", notes: "Requires generate-pdf edge function" },
      { label: "PDF copies generated on signing", notes: "Requires generate-pdf edge function" },
      { label: "PDF download opens in new tab", notes: "Requires get-pdf-download edge function + storage" },
      { label: "Billing checkout redirects to Stripe", notes: "Requires Stripe API key configuration" },
      { label: "Email notifications delivered", notes: "Requires email provider (Resend/etc) configuration" },
      { label: "Invite emails sent with onboarding link", notes: "Requires create-invite + email provider" },
    ],
  },
  {
    category: "Security",
    items: [
      { label: "Client cannot see other clients' tickets" },
      { label: "Worker cannot see other workers' tickets" },
      { label: "Invite token_hash not readable by authenticated users" },
      { label: "user_id on workers/signers only modifiable by agency_admin" },
      { label: "user_roles table blocked for client insert/update/delete" },
      { label: "Ticket signatures immutable after creation" },
      { label: "Audit logs immutable after creation" },
    ],
  },
];

export default function QAChecklist() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">QA Checklist</h1>
        <p className="text-sm text-muted-foreground">
          Manual test flows for pre-launch verification. Check each item during QA testing.
        </p>
      </div>

      <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
        <div>
          <strong className="text-warning">Internal page</strong>
          <p className="text-muted-foreground mt-0.5">
            This page is for development/QA use only. Items marked with notes may depend on external services (Stripe, email provider, PDF pipeline) that may not yet be configured.
          </p>
        </div>
      </div>

      {qaChecklist.map((section) => (
        <div key={section.category} className="rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">{section.category}</h2>
          <div className="space-y-2">
            {section.items.map((item, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <div className="mt-0.5 h-4 w-4 shrink-0 rounded border border-border" />
                <div className="flex-1">
                  <span className="font-medium">{item.label}</span>
                  {item.path && (
                    <span className="ml-2 text-xs font-mono text-muted-foreground">{item.path}</span>
                  )}
                  {item.notes && (
                    <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
