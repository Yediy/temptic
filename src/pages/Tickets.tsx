import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { mockTickets, type TicketStatus } from "@/lib/mock-data";

const statusFilters: (TicketStatus | "all")[] = ["all", "draft", "sent", "viewed", "signed", "rejected"];

export default function Tickets() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<TicketStatus | "all">("all");

  const filtered = mockTickets.filter((t) => {
    if (activeFilter !== "all" && t.status !== activeFilter) return false;
    if (search && !t.ticket_number.toLowerCase().includes(search.toLowerCase()) &&
        !t.client_name.toLowerCase().includes(search.toLowerCase()) &&
        !t.worker_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tickets</h1>
          <p className="text-sm text-muted-foreground">{mockTickets.length} total tickets</p>
        </div>
        <Button asChild>
          <Link to="/tickets/create">
            <Plus className="mr-1 h-4 w-4" />
            Create Ticket
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tickets, clients, workers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {statusFilters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                activeFilter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Ticket #</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Client</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Site</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Worker</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Job</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Hours</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ticket) => (
                <tr key={ticket.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
                  <td className="px-4 py-3 font-mono text-xs font-semibold tracking-wider">{ticket.ticket_number}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-medium uppercase text-secondary-foreground">
                      {ticket.ticket_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{ticket.work_date}</td>
                  <td className="px-4 py-3 font-medium">{ticket.client_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{ticket.site_name}</td>
                  <td className="px-4 py-3">{ticket.worker_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{ticket.job_title}</td>
                  <td className="px-4 py-3 font-mono">{ticket.total_hours}h</td>
                  <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    No tickets match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
