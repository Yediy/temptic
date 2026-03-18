import { Building2, MapPin, FileText, Mail, Phone } from "lucide-react";
import { mockClients } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";

export default function Clients() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">{mockClients.length} registered clients</p>
        </div>
        <Button>
          <Building2 className="mr-1 h-4 w-4" />
          Add Client
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mockClients.map((client) => (
          <div
            key={client.id}
            className="group rounded-xl border bg-card p-5 transition-all hover:shadow-md hover:border-accent/40 cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                  {client.company_name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-card-foreground">{client.company_name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${client.is_active ? "bg-success" : "bg-muted-foreground"}`} />
                    <span className="text-xs text-muted-foreground">{client.is_active ? "Active" : "Inactive"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>{client.sites_count} work sites</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                <span>{client.open_tickets} open tickets</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                <span>{client.billing_email}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
