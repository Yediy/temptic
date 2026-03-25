import { useState } from "react";
import { Building2, MapPin, FileText, Mail, Plus, UserPlus } from "lucide-react";
import { useClients, useCreateClient, useClientSites, useCreateClientSite } from "@/hooks/use-agency-data";
import { useCreateClientSigner, useClientSigners } from "@/hooks/use-agency-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

function AddClientDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ company_name: "", billing_email: "", billing_name: "", billing_phone: "" });
  const createClient = useCreateClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_name.trim()) { toast.error("Company name is required"); return; }
    try {
      await createClient.mutateAsync(form);
      toast.success("Client created — now add a work site and signer.");
      setOpen(false);
      setForm({ company_name: "", billing_email: "", billing_name: "", billing_phone: "" });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Building2 className="mr-1 h-4 w-4" />
          Add Client
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Client Company</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="company_name">Company Name *</Label>
            <Input id="company_name" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="billing_name">Billing Contact</Label>
            <Input id="billing_name" value={form.billing_name} onChange={e => setForm({ ...form, billing_name: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="billing_email">Billing Email</Label>
            <Input id="billing_email" type="email" value={form.billing_email} onChange={e => setForm({ ...form, billing_email: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="billing_phone">Phone</Label>
            <Input id="billing_phone" value={form.billing_phone} onChange={e => setForm({ ...form, billing_phone: e.target.value })} className="mt-1" />
          </div>
          <Button type="submit" className="w-full" disabled={createClient.isPending}>
            {createClient.isPending ? "Creating…" : "Create Client"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddSiteDialog({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ site_code: "", site_name: "", address_line1: "", city: "", state: "", zip: "", report_to_name: "", report_to_phone: "" });
  const createSite = useCreateClientSite();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.address_line1.trim()) { toast.error("Address is required"); return; }
    try {
      await createSite.mutateAsync({ ...form, client_id: clientId });
      toast.success("Site added");
      setOpen(false);
      setForm({ site_code: "", site_name: "", address_line1: "", city: "", state: "", zip: "", report_to_name: "", report_to_phone: "" });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1 h-3 w-3" />
          Add Site
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Work Site</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Site Code</Label>
              <Input value={form.site_code} onChange={e => setForm({ ...form, site_code: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Site Name</Label>
              <Input value={form.site_name} onChange={e => setForm({ ...form, site_name: e.target.value })} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Address *</Label>
            <Input value={form.address_line1} onChange={e => setForm({ ...form, address_line1: e.target.value })} required className="mt-1" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>City</Label>
              <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>State</Label>
              <Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>ZIP</Label>
              <Input value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Report To</Label>
              <Input value={form.report_to_name} onChange={e => setForm({ ...form, report_to_name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.report_to_phone} onChange={e => setForm({ ...form, report_to_phone: e.target.value })} className="mt-1" />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={createSite.isPending}>
            {createSite.isPending ? "Adding…" : "Add Site"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddSignerDialog({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", title: "" });
  const createSigner = useCreateClientSigner();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) { toast.error("Name is required"); return; }
    try {
      await createSigner.mutateAsync({ ...form, client_id: clientId });
      toast.success("Signer added — they can be invited to the client portal later.");
      setOpen(false);
      setForm({ first_name: "", last_name: "", email: "", phone: "", title: "" });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="mr-1 h-3 w-3" />
          Add Signer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Authorized Signer</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">Add a person authorized to sign tickets for this client. They can be linked to a portal account later.</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>First Name *</Label>
              <Input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} required className="mt-1" />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} required className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Site Foreman" className="mt-1" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="For portal invitations" className="mt-1" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="mt-1" />
          </div>
          <Button type="submit" className="w-full" disabled={createSigner.isPending}>
            {createSigner.isPending ? "Adding…" : "Add Signer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ClientSitesList({ clientId }: { clientId: string }) {
  const { data: sites } = useClientSites(clientId);
  if (!sites || sites.length === 0) return <p className="text-xs text-muted-foreground mt-2">No work sites yet. Add a site to create tickets.</p>;
  return (
    <div className="mt-3 space-y-1.5">
      {sites.map(s => (
        <div key={s.id} className="rounded-md bg-muted/50 px-3 py-2 text-xs">
          <span className="font-medium">{s.site_code ? `${s.site_code} — ` : ""}{s.site_name || s.address_line1}</span>
          {s.report_to_name && <span className="ml-2 text-muted-foreground">· {s.report_to_name}</span>}
        </div>
      ))}
    </div>
  );
}

function ClientSignersList({ clientId }: { clientId: string }) {
  const { data: signers } = useClientSigners(clientId);
  if (!signers || signers.length === 0) return <p className="text-xs text-muted-foreground mt-2">No authorized signers yet.</p>;
  return (
    <div className="mt-2 space-y-1.5">
      {signers.map(s => (
        <div key={s.id} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-xs">
          <div>
            <span className="font-medium">{s.first_name} {s.last_name}</span>
            {s.title && <span className="text-muted-foreground ml-1">· {s.title}</span>}
          </div>
          <div className="flex items-center gap-2">
            {s.email && <span className="text-muted-foreground">{s.email}</span>}
            {s.user_id ? (
              <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-medium text-success">Linked</span>
            ) : (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Not linked</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Clients() {
  const { data: clients, isLoading } = useClients();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading…" : `${clients?.length ?? 0} registered clients`}
          </p>
        </div>
        <AddClientDialog />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 animate-pulse rounded-xl border bg-muted/30" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients?.map((client) => (
            <div
              key={client.id}
              className="group rounded-xl border bg-card p-5 transition-all hover:shadow-md hover:border-accent/40 cursor-pointer"
              onClick={() => setExpanded(expanded === client.id ? null : client.id)}
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
                {client.billing_email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{client.billing_email}</span>
                  </div>
                )}
              </div>

              {expanded === client.id && (
                <div className="mt-4 border-t pt-3 space-y-4">
                  {/* Sites */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Work Sites</span>
                      <div onClick={e => e.stopPropagation()}>
                        <AddSiteDialog clientId={client.id} />
                      </div>
                    </div>
                    <ClientSitesList clientId={client.id} />
                  </div>

                  {/* Signers */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Authorized Signers</span>
                      <div onClick={e => e.stopPropagation()}>
                        <AddSignerDialog clientId={client.id} />
                      </div>
                    </div>
                    <ClientSignersList clientId={client.id} />
                  </div>
                </div>
              )}
            </div>
          ))}
          {clients?.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed bg-card p-12 text-center">
              <Building2 className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No clients yet. Add your first client company to get started.</p>
              <p className="text-xs text-muted-foreground mt-1">Create a client → add a work site → add authorized signers → create tickets.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
