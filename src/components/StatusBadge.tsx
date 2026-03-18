import { cn } from "@/lib/utils";
import type { TicketStatus } from "@/lib/mock-data";

const statusConfig: Record<TicketStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-status-draft/15 text-status-draft" },
  sent: { label: "Sent", className: "bg-status-sent/15 text-status-sent" },
  viewed: { label: "Viewed", className: "bg-status-viewed/15 text-status-viewed" },
  signed: { label: "Signed", className: "bg-status-signed/15 text-status-signed" },
  rejected: { label: "Rejected", className: "bg-status-rejected/15 text-status-rejected" },
  corrected: { label: "Corrected", className: "bg-status-corrected/15 text-status-corrected" },
  closed: { label: "Closed", className: "bg-status-closed/15 text-status-closed" },
};

export function StatusBadge({ status, className }: { status: TicketStatus; className?: string }) {
  const config = statusConfig[status];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide", config.className, className)}>
      {config.label}
    </span>
  );
}
