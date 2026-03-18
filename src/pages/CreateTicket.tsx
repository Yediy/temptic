import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mockClients, mockSites, mockWorkers } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const steps = [
  { label: "Client & Site", description: "Select client and work site" },
  { label: "Worker", description: "Assign a worker" },
  { label: "Job Details", description: "Title, equipment, start time" },
  { label: "Requirements", description: "PPE and logistics" },
  { label: "Review", description: "Review and send" },
];

export default function CreateTicket() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    client_id: "",
    site_id: "",
    worker_id: "",
    job_title: "",
    equipment_required: "",
    equipment_provided: false,
    start_time: "07:00",
    date: "2026-03-18",
    lunch: false,
    transportation: false,
    hard_hat: true,
    boots: true,
    gloves: false,
    glasses: true,
    vest: true,
  });

  const selectedClient = mockClients.find((c) => c.id === form.client_id);
  const clientSites = mockSites.filter((s) => s.client_id === form.client_id);
  const selectedSite = mockSites.find((s) => s.id === form.site_id);
  const selectedWorker = mockWorkers.find((w) => w.id === form.worker_id);

  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Daily Ticket</h1>
          <p className="text-sm text-muted-foreground">TT-2026-000108</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                i < step ? "bg-success text-success-foreground" :
                i === step ? "bg-primary text-primary-foreground" :
                "bg-muted text-muted-foreground"
              )}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={cn("h-0.5 flex-1 rounded", i < step ? "bg-success" : "bg-border")} />
            )}
          </div>
        ))}
      </div>
      <p className="text-sm font-medium">{steps[step].label} <span className="text-muted-foreground">— {steps[step].description}</span></p>

      {/* Step content */}
      <div className="rounded-xl border bg-card p-6">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <Label>Client</Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {mockClients.filter(c => c.is_active).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setForm({ ...form, client_id: c.id, site_id: "" })}
                    className={cn(
                      "rounded-lg border p-3 text-left text-sm transition-all",
                      form.client_id === c.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-accent"
                    )}
                  >
                    <p className="font-semibold">{c.company_name}</p>
                    <p className="text-xs text-muted-foreground">{c.sites_count} sites · {c.open_tickets} open</p>
                  </button>
                ))}
              </div>
            </div>
            {form.client_id && (
              <div>
                <Label>Work Site</Label>
                <div className="mt-2 grid gap-2">
                  {clientSites.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setForm({ ...form, site_id: s.id })}
                      className={cn(
                        "rounded-lg border p-3 text-left text-sm transition-all",
                        form.site_id === s.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-accent"
                      )}
                    >
                      <p className="font-semibold">{s.site_code} — {s.site_name}</p>
                      <p className="text-xs text-muted-foreground">{s.address}, {s.city}, {s.state}</p>
                      <p className="text-xs text-muted-foreground">Report to: {s.report_to_name} · {s.report_to_phone}</p>
                    </button>
                  ))}
                  {clientSites.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4">No sites registered for this client.</p>
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
              {mockWorkers.filter(w => w.is_active).map((w) => (
                <button
                  key={w.id}
                  onClick={() => setForm({ ...form, worker_id: w.id })}
                  className={cn(
                    "rounded-lg border p-3 text-left text-sm transition-all",
                    form.worker_id === w.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-accent"
                  )}
                >
                  <p className="font-semibold">{w.first_name} {w.last_name}</p>
                  <p className="text-xs text-muted-foreground">{w.worker_code} · {w.trade} · {w.classification}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="start_time">Start Time</Label>
                <Input id="start_time" type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div>
              <Label htmlFor="job_title">Job Title</Label>
              <Input id="job_title" placeholder="e.g. Electrical Rough-In" value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="equipment">Equipment Required</Label>
              <Input id="equipment" placeholder="e.g. Wire strippers, multimeter" value={form.equipment_required} onChange={(e) => setForm({ ...form, equipment_required: e.target.value })} className="mt-1" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.equipment_provided} onChange={(e) => setForm({ ...form, equipment_provided: e.target.checked })} className="rounded" />
              Equipment provided by agency
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">Select required PPE and logistics for this job.</p>
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
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                  className="rounded"
                />
                <span className="font-medium">{label}</span>
              </label>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Review Ticket</h3>
            <div className="grid gap-3 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Client</span>
                <span className="font-medium">{selectedClient?.company_name || "—"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Site</span>
                <span className="font-medium">{selectedSite?.site_name || "—"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Worker</span>
                <span className="font-medium">{selectedWorker ? `${selectedWorker.first_name} ${selectedWorker.last_name}` : "—"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{form.date}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Start Time</span>
                <span className="font-medium">{form.start_time}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Job Title</span>
                <span className="font-medium">{form.job_title || "—"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Equipment</span>
                <span className="font-medium">{form.equipment_required || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">PPE</span>
                <span className="font-medium text-right">
                  {[
                    form.hard_hat && "Hard Hat",
                    form.boots && "Boots",
                    form.glasses && "Glasses",
                    form.gloves && "Gloves",
                    form.vest && "Vest",
                  ].filter(Boolean).join(", ") || "None"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        {step < 4 ? (
          <Button onClick={() => setStep(step + 1)}>
            Next
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline">
              <FileText className="mr-1 h-4 w-4" />
              Save Draft
            </Button>
            <Button>
              Send for Signature
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
