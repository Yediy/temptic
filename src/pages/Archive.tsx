import { useState } from "react";
import { Archive as ArchiveIcon, Download, Search, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge, type TicketStatus } from "@/components/StatusBadge";
import { useTickets, useClients, useWorkers } from "@/hooks/use-agency-data";
import { downloadPdf } from "@/lib/download-pdf";
import { toast } from "sonner";

export default function Archive() {
  const { data: tickets, isLoading } = useTickets();
  const { data: clients } = useClients();
  const { data: workers } = useWorkers();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [workerFilter, setWorkerFilter] = useState<string>("all");

  const archivable = (tickets ?? []).filter(t =>
    ["signed", "rejected", "closed", "corrected"].includes(t.status)
  );

  const filtered = archivable.filter(t => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (clientFilter !== "all" && t.client_id !== clientFilter) return false;
    if (workerFilter !== "all" && t.worker_id !== workerFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !t.ticket_number.toLowerCase().includes(q) &&
        !t.client_company_name_snapshot.toLowerCase().includes(q) &&
        !t.worker_name_snapshot.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const handleDownload = async (ticketId: string, pdfType: "agency_copy" | "client_copy" | "worker_copy") => {
    try {
      await downloadPdf(ticketId, pdfType);
    } catch {
      toast.error("PDF not available for this ticket.");
    }
  };

  const handleExportCsv = () => {
    if (filtered.length === 0) { toast.info("No tickets to export"); return; }
    const headers = ["Ticket #", "Type", "Status", "Client", "Worker", "Date", "Hours"];
    const rows = filtered.map(t => [
      t.ticket_number,
      t.ticket_type,
      t.status,
      t.client_company_name_snapshot,
      t.worker_name_snapshot,
      t.work_date || t.week_start_date || "",
      String(t.total_hours ?? 0),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `temptic-archive-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} tickets to CSV`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">PDF Archive</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading…" : `${archivable.length} completed tickets`}
          </p>
        </div>
        <Button variant="outline" onClick={handleExportCsv} disabled={filtered.length === 0}>
          <Download className="mr-1 h-4 w-4" />
          Export CSV ({filtered.length})
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search tickets, clients, workers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border bg-card px-3 py-2 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="signed">Signed</option>
          <option value="rejected">Rejected</option>
          <option value="closed">Closed</option>
          <option value="corrected">Corrected</option>
        </select>
        <select
          value={clientFilter}
          onChange={e => setClientFilter(e.target.value)}
          className="rounded-lg border bg-card px-3 py-2 text-sm"
        >
          <option value="all">All Clients</option>
          {clients?.map(c => (
            <option key={c.id} value={c.id}>{c.company_name}</option>
          ))}
        </select>
        <select
          value={workerFilter}
          onChange={e => setWorkerFilter(e.target.value)}
          className="rounded-lg border bg-card px-3 py-2 text-sm"
        >
          <option value="all">All Workers</option>
          {workers?.map(w => (
            <option key={w.id} value={w.id}>{w.first_name} {w.last_name}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-3">
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-12 text-center">
            <ArchiveIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              {archivable.length === 0
                ? "No completed tickets yet. Signed, rejected, or closed tickets will appear here."
                : "No tickets match your current filters."}
            </p>
          </div>
        ) : (
          filtered.map((ticket) => (
            <div key={ticket.id} className="flex items-center justify-between rounded-xl border bg-card p-4 hover:shadow-sm transition-all">
              <div className="flex items-center gap-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  ticket.status === "signed" ? "bg-success/10" : "bg-muted"
                }`}>
                  <ArchiveIcon className={`h-5 w-5 ${
                    ticket.status === "signed" ? "text-success" : "text-muted-foreground"
                  }`} />
                </div>
                <div>
                  <p className="font-mono text-xs font-semibold tracking-wider">{ticket.ticket_number}</p>
                  <p className="text-sm text-muted-foreground">
                    {ticket.client_company_name_snapshot} · {ticket.worker_name_snapshot} · {ticket.work_date || ticket.week_start_date || "—"}
                    <span className="ml-1 rounded bg-secondary px-1 py-0.5 text-[10px] uppercase">{ticket.ticket_type}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={ticket.status as TicketStatus} />
                {ticket.status === "signed" && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleDownload(ticket.id, "agency_copy")}>
                      <FileText className="mr-0.5 h-3 w-3" /> Agency
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleDownload(ticket.id, "client_copy")}>
                      <FileText className="mr-0.5 h-3 w-3" /> Client
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleDownload(ticket.id, "worker_copy")}>
                      <FileText className="mr-0.5 h-3 w-3" /> Worker
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
