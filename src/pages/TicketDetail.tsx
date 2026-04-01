import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Send, FileText, Clock, Eye, CheckCircle2, XCircle, RotateCcw, Download, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge, type TicketStatus } from "@/components/StatusBadge";
import { useSendTicket } from "@/hooks/use-ticket-actions";
import { downloadPdf } from "@/lib/download-pdf";
import { toast } from "sonner";

const timelineIcons: Record<string, typeof Clock> = {
  draft: FileText,
  sent: Send,
  viewed: Eye,
  signed: CheckCircle2,
  rejected: XCircle,
  corrected: RotateCcw,
  closed: CheckCircle2,
};

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sendTicket = useSendTicket();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("tickets").select("*, ticket_days(*)").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: signatures } = useQuery({
    queryKey: ["ticket-signatures", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("ticket_signatures").select("*").eq("ticket_id", id!).order("signed_at");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!ticket) {
    return <div className="py-24 text-center text-muted-foreground">Ticket not found.</div>;
  }

  const timeline = [
    { status: "draft", label: "Created", time: ticket.created_at },
    ticket.sent_at && { status: "sent", label: "Sent", time: ticket.sent_at },
    ticket.viewed_at && { status: "viewed", label: "Viewed", time: ticket.viewed_at },
    ticket.signed_at && { status: "signed", label: "Signed", time: ticket.signed_at },
    ticket.rejected_at && { status: "rejected", label: "Rejected", time: ticket.rejected_at },
  ].filter(Boolean) as { status: string; label: string; time: string }[];

  const rows = [
    ["Ticket #", ticket.ticket_number],
    ["Type", ticket.ticket_type?.toUpperCase()],
    ["Client", ticket.client_company_name_snapshot],
    ["Site", ticket.site_name_snapshot || ticket.site_address_snapshot || "—"],
    ["Worker", ticket.worker_name_snapshot],
    ["Date", ticket.work_date || (ticket.week_start_date ? `${ticket.week_start_date} – ${ticket.week_end_date}` : "—")],
    ["Start Time", ticket.start_time || "—"],
    ["Job Title", ticket.job_title || "—"],
    ["Equipment", ticket.equipment_required || "—"],
    ["Hours", `${ticket.total_hours ?? 0}h`],
    ["PPE", [
      ticket.hard_hat_required && "Hard Hat",
      ticket.boots_required && "Boots",
      ticket.glasses_required && "Glasses",
      ticket.gloves_required && "Gloves",
      ticket.vest_required && "Vest",
    ].filter(Boolean).join(", ") || "None"],
    ["Lunch", ticket.lunch_required ? "Yes" : "No"],
    ["Transportation", ticket.transportation_provided ? "Provided" : "No"],
    ["Report To", ticket.report_to_name_snapshot ? `${ticket.report_to_name_snapshot} · ${ticket.report_to_phone_snapshot || ""}` : "—"],
    ["Notes", ticket.notes || "—"],
  ];

  if (ticket.rejection_reason) {
    rows.push(["Rejection Reason", ticket.rejection_reason]);
  }
  if (ticket.supervisor_name) {
    rows.push(["Supervisor", `${ticket.supervisor_name}${ticket.supervisor_title ? ` (${ticket.supervisor_title})` : ""}`]);
  }

  const handleSend = async () => {
    try {
      await sendTicket.mutateAsync(ticket.id);
      toast.success("Ticket sent for signature");
    } catch (err: any) {
      toast.error(err.message || "Failed to send ticket");
    }
  };

  const handleDownload = async (pdfType: "draft" | "agency_copy" | "client_copy" | "worker_copy") => {
    try {
      await downloadPdf(ticket.id, pdfType);
    } catch (err: any) {
      toast.error(err.message || "PDF not available");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight font-mono">{ticket.ticket_number}</h1>
            <StatusBadge status={ticket.status as TicketStatus} />
          </div>
          <p className="text-sm text-muted-foreground">{ticket.client_company_name_snapshot} · {ticket.worker_name_snapshot}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {["draft", "corrected"].includes(ticket.status) && (
            <Button onClick={handleSend} disabled={sendTicket.isPending}>
              <Send className="mr-1 h-4 w-4" /> {ticket.status === "corrected" ? "Resend" : "Send"}
            </Button>
          )}
          {["draft", "rejected", "corrected"].includes(ticket.status) && (
            <Button variant="outline" onClick={() => navigate(`/tickets/${id}/edit`)}>
              <FileText className="mr-1 h-4 w-4" /> Edit
            </Button>
          )}
          {ticket.status === "signed" && (
            <Button variant="outline" onClick={() => handleDownload("agency_copy")}>
              <Download className="mr-1 h-4 w-4" /> Download PDF
            </Button>
          )}
          {ticket.status === "draft" && (
            <Button variant="outline" onClick={() => handleDownload("draft")}>
              <Download className="mr-1 h-4 w-4" /> Draft PDF
            </Button>
          )}
        </div>
      </div>

      {/* PDF availability note for signed tickets */}
      {ticket.status === "signed" && (
        <div className="rounded-lg border border-muted bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          PDF downloads depend on the document generation pipeline. If a download fails, the PDF may still be generating or the storage service may not be fully configured.
        </div>
      )}

      {/* Timeline */}
      <div className="rounded-xl border bg-card p-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Timeline</h3>
        <div className="flex items-center gap-2 overflow-x-auto">
          {timeline.map((event, i) => {
            const Icon = timelineIcons[event.status] || Clock;
            return (
              <div key={i} className="flex items-center gap-2">
                {i > 0 && <div className="h-0.5 w-6 bg-border" />}
                <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-semibold">{event.label}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(event.time).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly ticket days */}
      {ticket.ticket_type === "weekly" && (ticket as any).ticket_days?.length > 0 && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">Weekly Hours</h3>
          <div className="grid gap-2 text-sm">
            {(ticket as any).ticket_days.map((day: any) => (
              <div key={day.id} className="flex justify-between border-b border-border/50 pb-2 last:border-0">
                <span className="text-muted-foreground">{day.day_name || day.day_date}</span>
                <span className="font-medium">
                  {day.start_time || "—"} – {day.end_time || "—"} · {day.total_hours}h
                  {day.overtime_hours > 0 && <span className="text-xs text-destructive ml-1">({day.overtime_hours}h OT)</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Details */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4">Ticket Details</h3>
        <div className="grid gap-3 text-sm">
          {rows.map(([label, val]) => (
            <div key={label as string} className="flex justify-between border-b border-border/50 pb-2 last:border-0">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium text-right max-w-[60%]">{(val as string) || "—"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Signatures */}
      {signatures && signatures.length > 0 && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">Signatures</h3>
          <div className="space-y-3">
            {signatures.map(sig => (
              <div key={sig.id} className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                <div>
                  <p className="font-medium text-sm">{sig.signer_name}</p>
                  <p className="text-xs text-muted-foreground">{sig.signer_type} · {sig.signer_title || "No title"}</p>
                </div>
                <p className="text-xs text-muted-foreground">{new Date(sig.signed_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
