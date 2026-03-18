import { Archive as ArchiveIcon, Download, Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { mockTickets } from "@/lib/mock-data";

export default function Archive() {
  const [search, setSearch] = useState("");
  const signedTickets = mockTickets.filter(
    (t) => t.status === "signed" || t.status === "closed"
  );

  const filtered = signedTickets.filter(
    (t) =>
      !search ||
      t.ticket_number.toLowerCase().includes(search.toLowerCase()) ||
      t.client_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">PDF Archive</h1>
          <p className="text-sm text-muted-foreground">{signedTickets.length} archived tickets</p>
        </div>
        <Button variant="outline">
          <Download className="mr-1 h-4 w-4" />
          Export Week
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search archive..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid gap-3">
        {filtered.map((ticket) => (
          <div key={ticket.id} className="flex items-center justify-between rounded-xl border bg-card p-4 hover:shadow-sm transition-all">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <ArchiveIcon className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="font-mono text-xs font-semibold tracking-wider">{ticket.ticket_number}</p>
                <p className="text-sm text-muted-foreground">{ticket.client_name} · {ticket.worker_name} · {ticket.work_date}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={ticket.status} />
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="text-xs">Agency</Button>
                <Button variant="ghost" size="sm" className="text-xs">Client</Button>
                <Button variant="ghost" size="sm" className="text-xs">Worker</Button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">No archived tickets found.</div>
        )}
      </div>
    </div>
  );
}
