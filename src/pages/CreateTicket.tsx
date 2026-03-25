import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, FileText, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useClients, useClientSites, useWorkers, useCreateTicket, generateTicketNumber } from "@/hooks/use-agency-data";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

const steps = [
  { label: "Client & Site", description: "Select client and work site" },
  { label: "Worker", description: "Assign a worker" },
  { label: "Job Details", description: "Title, equipment, start time" },
  { label: "Requirements", description: "PPE and logistics" },
  { label: "Review", description: "Review and send" },
];

export default function CreateTicket() {
  const navigate = useNavigate();
  const { agencyId, user } = useAuth();
  const [step, setStep] = useState(0);
  const [ticketNumber, setTicketNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const createTicket = useCreateTicket();

  const [form, setForm] = useState({
    client_id: "",
    site_id: "",
    worker_id: "",
    job_title: "",
    equipment_required: "",
    equipment_provided: false,
    start_time: "07:00",
    date: new Date().toISOString().slice(0, 10),
    lunch: false,
    transportation: false,
    hard_hat: true,
    boots: true,
    gloves: false,
    glasses: true,
    vest: true,
    notes: "",
  });

  const { data: clients } = useClients();
  const { data: sites } = useClientSites(form.client_id || undefined);
  const { data: workers } = useWorkers();

  const selectedClient = clients?.find(c => c.id === form.client_id);
  const selectedSite = sites?.find(s => s.id === form.site_id);
  const selectedWorker = workers?.find(w => w.id === form.worker_id);

  useEffect(() => {
    if (agencyId) generateTicketNumber(agencyId).then(setTicketNumber);
  }, [agencyId]);

  const handleSave = async (status: "draft" | "sent") => {
    if (!agencyId || !selectedClient || !selectedWorker) return;
    setSaving(true);
    try {
      const siteAddr = selectedSite
        ? [selectedSite.address_line1, selectedSite.city, selectedSite.state].filter(Boolean).join(", ")
        : null;

      await createTicket.mutateAsync({
        agency_id: agencyId,
        client_id: form.client_id,
        site_id: form.site_id || null,
        worker_id: form.worker_id,
        created_by: user?.id ?? null,
        ticket_number: ticketNumber,
        ticket_type: "daily",
        status,
        work_date: form.date,
        start_time: form.start_time,
        job_title: form.job_title || null,
        equipment_required: form.equipment_required || null,
        equipment_provided: form.equipment_provided,
        lunch_required: form.lunch,
        transportation_provided: form.transportation,
        hard_hat_required: form.hard_hat,
        boots_required: form.boots,
        gloves_required: form.gloves,
        glasses_required: form.glasses,
        vest_required: form.vest,
        notes: form.notes || null,
        client_company_name_snapshot: selectedClient.company_name,
        site_code_snapshot: selectedSite?.site_code ?? null,
        site_name_snapshot: selectedSite?.site_name ?? null,
        site_address_snapshot: siteAddr,
        report_to_name_snapshot: selectedSite?.report_to_name ?? null,
        report_to_phone_snapshot: selectedSite?.report_to_phone ?? null,
        worker_name_snapshot: `${selectedWorker.first_name} ${selectedWorker.last_name}`,
        sent_at: status === "sent" ? new Date().toISOString() : null,
      });
      toast.success(status === "sent" ? "Ticket sent for signature" : "Draft saved");
      navigate("/tickets");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const canNext = () => {
    if (step === 0) return !!form.client_id && !!form.site_id;
    if (step === 1) return !!form.worker_id;
    return true;
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Daily Ticket</h1>
          <p className="text-sm text-muted-foreground font-mono">{ticketNumber || "Generating…"}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
              i < step ? "bg-success text-success-foreground" :
              i === step ? "bg-primary text-primary-foreground" :
              "bg-muted text-muted-foreground"
            )}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={cn("h-0.5 flex-1 rounded", i < step ? "bg-success" : "bg-border")} />
            )}
          </div>
        ))}
      </div>
      <p className="text-sm font-medium">{steps[step].label} <span className="text-muted-foreground">— {steps[step].description}</span></p>

      {/* Steps */}
      <div className="rounded-xl border bg-card p-6">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <Label>Client</Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {clients?.filter(c => c.is_active).map(c => (
                  <button key={c.id} onClick={() => setForm({ ...form, client_id: c.id, site_id: "" })}
                    className={cn("rounded-lg border p-3 text-left text-sm transition-all",
                      form.client_id === c.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-accent"
                    )}>
                    <p className="font-semibold">{c.company_name}</p>
                    <p className="text-xs text-muted-foreground">{c.billing_email || "No email"}</p>
                  </button>
                ))}
                {(!clients || clients.filter(c => c.is_active).length === 0) && (
                  <p className="col-span-2 py-4 text-sm text-muted-foreground">No active clients. Add clients first.</p>
                )}
              </div>
            </div>
            {form.client_id && (
              <div>
                <Label>Work Site</Label>
                <div className="mt-2 grid gap-2">
                  {sites?.map(s => (
                    <button key={s.id} onClick={() => setForm({ ...form, site_id: s.id })}
                      className={cn("rounded-lg border p-3 text-left text-sm transition-all",
                        form.site_id === s.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-accent"
                      )}>
                      <p className="font-semibold">{s.site_code ? `${s.site_code} — ` : ""}{s.site_name || s.address_line1}</p>
                      <p className="text-xs text-muted-foreground">{[s.address_line1, s.city, s.state].filter(Boolean).join(", ")}</p>
                      {s.report_to_name && <p className="text-xs text-muted-foreground">Report to: {s.report_to_name} · {s.report_to_phone}</p>}
                    </button>
                  ))}
                  {(!sites || sites.length === 0) && (
                    <p className="text-sm text-muted-foreground py-4">No sites for this client.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div>
            <Label>Select Worker</Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {workers?.filter(w => w.is_active).map(w => (
                <button key={w.id} onClick={() => setForm({ ...form, worker_id: w.id })}
                  className={cn("rounded-lg border p-3 text-left text-sm transition-all",
                    form.worker_id === w.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-accent"
                  )}>
                  <p className="font-semibold">{w.first_name} {w.last_name}</p>
                  <p className="text-xs text-muted-foreground">{w.worker_code || ""} · {w.trade || "No trade"} · {w.classification || ""}</p>
                </button>
              ))}
              {(!workers || workers.filter(w => w.is_active).length === 0) && (
                <p className="col-span-2 py-4 text-sm text-muted-foreground">No active workers. Add workers first.</p>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="start_time">Start Time</Label>
                <Input id="start_time" type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div>
              <Label htmlFor="job_title">Job Title</Label>
              <Input id="job_title" placeholder="e.g. Electrical Rough-In" value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="equipment">Equipment Required</Label>
              <Input id="equipment" placeholder="e.g. Wire strippers, multimeter" value={form.equipment_required} onChange={e => setForm({ ...form, equipment_required: e.target.value })} className="mt-1" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.equipment_provided} onChange={e => setForm({ ...form, equipment_provided: e.target.checked })} className="rounded" />
              Equipment provided by agency
            </label>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" placeholder="Special instructions…" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="mt-1" rows={3} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">Select required PPE and logistics.</p>
            {([
              { key: "hard_hat", label: "Hard Hat" },
              { key: "boots", label: "Safety Boots" },
              { key: "glasses", label: "Safety Glasses" },
              { key: "gloves", label: "Gloves" },
              { key: "vest", label: "Hi-Vis Vest" },
              { key: "lunch", label: "Lunch Required" },
              { key: "transportation", label: "Transportation Provided" },
            ] as const).map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 rounded-lg border p-3 text-sm cursor-pointer hover:bg-muted/30 transition-colors">
                <input type="checkbox" checked={form[key]} onChange={e => setForm({ ...form, [key]: e.target.checked })} className="rounded" />
                <span className="font-medium">{label}</span>
              </label>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Review Ticket</h3>
            <div className="grid gap-3 text-sm">
              {[
                ["Client", selectedClient?.company_name],
                ["Site", selectedSite?.site_name || selectedSite?.address_line1],
                ["Worker", selectedWorker ? `${selectedWorker.first_name} ${selectedWorker.last_name}` : undefined],
                ["Date", form.date],
                ["Start Time", form.start_time],
                ["Job Title", form.job_title],
                ["Equipment", form.equipment_required],
                ["PPE", [form.hard_hat && "Hard Hat", form.boots && "Boots", form.glasses && "Glasses", form.gloves && "Gloves", form.vest && "Vest"].filter(Boolean).join(", ") || "None"],
                ["Notes", form.notes],
              ].map(([label, val]) => (
                <div key={label as string} className="flex justify-between border-b pb-2 last:border-0">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-right max-w-[60%]">{(val as string) || "—"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        {step < 4 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
            Next <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleSave("draft")} disabled={saving}>
              <FileText className="mr-1 h-4 w-4" /> Save Draft
            </Button>
            <Button onClick={() => handleSave("sent")} disabled={saving}>
              <Send className="mr-1 h-4 w-4" /> Send for Signature
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
