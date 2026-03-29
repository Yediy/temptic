import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, FileText, Send, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useClients, useClientSites, useWorkers, useCreateTicket, generateTicketNumber } from "@/hooks/use-agency-data";
import { useSendTicket } from "@/hooks/use-ticket-actions";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { addDays, format, startOfWeek, parseISO } from "date-fns";

const steps = [
  { label: "Client & Site", description: "Select client and work site" },
  { label: "Worker", description: "Assign a worker" },
  { label: "Week & Hours", description: "Enter daily time for the week" },
  { label: "Requirements", description: "PPE and logistics" },
  { label: "Review", description: "Review and send" },
];

interface DayEntry {
  day_name: string;
  day_date: string;
  start_time: string;
  end_time: string;
  lunch_start: string;
  lunch_end: string;
  regular_hours: number;
  overtime_hours: number;
  total_hours: number;
}

function calcHours(start: string, end: string, lunchStart: string, lunchEnd: string): { regular: number; overtime: number; total: number } {
  if (!start || !end) return { regular: 0, overtime: 0, total: 0 };
  const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  let worked = toMin(end) - toMin(start);
  if (worked < 0) worked += 24 * 60;
  if (lunchStart && lunchEnd) {
    let lunch = toMin(lunchEnd) - toMin(lunchStart);
    if (lunch < 0) lunch += 24 * 60;
    worked -= lunch;
  }
  const hours = Math.max(0, worked / 60);
  const regular = Math.min(hours, 8);
  const overtime = Math.max(0, hours - 8);
  return { regular: Math.round(regular * 100) / 100, overtime: Math.round(overtime * 100) / 100, total: Math.round(hours * 100) / 100 };
}

function getWeekDays(weekStart: string): DayEntry[] {
  const start = parseISO(weekStart);
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return dayNames.map((name, i) => ({
    day_name: name,
    day_date: format(addDays(start, i), "yyyy-MM-dd"),
    start_time: i < 5 ? "07:00" : "",
    end_time: i < 5 ? "15:30" : "",
    lunch_start: i < 5 ? "12:00" : "",
    lunch_end: i < 5 ? "12:30" : "",
    regular_hours: i < 5 ? 8 : 0,
    overtime_hours: 0,
    total_hours: i < 5 ? 8 : 0,
  }));
}

export default function CreateWeeklyTicket() {
  const navigate = useNavigate();
  const { agencyId, user } = useAuth();
  const [step, setStep] = useState(0);
  const [ticketNumber, setTicketNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const createTicket = useCreateTicket();
  const sendTicket = useSendTicket();

  const monday = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const [form, setForm] = useState({
    client_id: "",
    site_id: "",
    worker_id: "",
    job_title: "",
    equipment_required: "",
    equipment_provided: false,
    week_start: monday,
    lunch: false,
    transportation: false,
    hard_hat: true,
    boots: true,
    gloves: false,
    glasses: true,
    vest: true,
    notes: "",
  });

  const [days, setDays] = useState<DayEntry[]>(() => getWeekDays(monday));

  const { data: clients } = useClients();
  const { data: sites } = useClientSites(form.client_id || undefined);
  const { data: workers } = useWorkers();

  const selectedClient = clients?.find(c => c.id === form.client_id);
  const selectedSite = sites?.find(s => s.id === form.site_id);
  const selectedWorker = workers?.find(w => w.id === form.worker_id);

  useEffect(() => { if (agencyId) generateTicketNumber(agencyId).then(setTicketNumber); }, [agencyId]);

  const updateWeekStart = (newStart: string) => {
    setForm(f => ({ ...f, week_start: newStart }));
    setDays(getWeekDays(newStart));
  };

  const updateDay = (idx: number, field: keyof DayEntry, value: string) => {
    setDays(prev => {
      const updated = [...prev];
      const day = { ...updated[idx], [field]: value };
      const { regular, overtime, total } = calcHours(day.start_time, day.end_time, day.lunch_start, day.lunch_end);
      day.regular_hours = regular;
      day.overtime_hours = overtime;
      day.total_hours = total;
      updated[idx] = day;
      return updated;
    });
  };

  const totalWeekHours = useMemo(() => days.reduce((s, d) => s + d.total_hours, 0), [days]);
  const totalRegular = useMemo(() => days.reduce((s, d) => s + d.regular_hours, 0), [days]);
  const totalOvertime = useMemo(() => days.reduce((s, d) => s + d.overtime_hours, 0), [days]);

  const weekEnd = format(addDays(parseISO(form.week_start), 6), "yyyy-MM-dd");

  const handleSave = async (sendAfterCreate: boolean) => {
    if (!agencyId || !selectedClient || !selectedWorker) return;
    setSaving(true);
    try {
      const siteAddr = selectedSite
        ? [selectedSite.address_line1, selectedSite.city, selectedSite.state].filter(Boolean).join(", ")
        : null;

      const ticket = await createTicket.mutateAsync({
        agency_id: agencyId,
        client_id: form.client_id,
        site_id: form.site_id || null,
        worker_id: form.worker_id,
        created_by: user?.id ?? null,
        ticket_number: ticketNumber,
        ticket_type: "weekly",
        status: "draft",
        week_start_date: form.week_start,
        week_end_date: weekEnd,
        total_hours: totalWeekHours,
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
      });

      // Insert ticket_days
      const dayRows = days.filter(d => d.total_hours > 0).map(d => ({
        ticket_id: ticket.id,
        day_name: d.day_name,
        day_date: d.day_date,
        start_time: d.start_time || null,
        end_time: d.end_time || null,
        lunch_start: d.lunch_start || null,
        lunch_end: d.lunch_end || null,
        regular_hours: d.regular_hours,
        overtime_hours: d.overtime_hours,
        total_hours: d.total_hours,
      }));

      if (dayRows.length > 0) {
        const { error: daysErr } = await supabase.from("ticket_days").insert(dayRows);
        if (daysErr) throw daysErr;
      }

      if (sendAfterCreate) {
        await sendTicket.mutateAsync(ticket.id);
        toast.success("Weekly ticket sent for signature");
      } else {
        toast.success("Draft saved");
      }
      navigate("/tickets");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const canNext = () => {
    if (step === 0) return !!form.client_id;
    if (step === 1) return !!form.worker_id;
    return true;
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Weekly Ticket</h1>
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

      <div className="rounded-xl border bg-card p-6">
        {/* Step 0: Client & Site - same as daily */}
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
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Worker */}
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
                  <p className="text-xs text-muted-foreground">{w.worker_code || ""} · {w.trade || "No trade"}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Weekly time grid */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="week_start">Week Starting (Monday)</Label>
                <Input id="week_start" type="date" value={form.week_start} onChange={e => updateWeekStart(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="job_title">Job Title</Label>
                <Input id="job_title" placeholder="e.g. Electrical Rough-In" value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })} className="mt-1" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-2 py-2 text-left font-semibold text-muted-foreground w-24">Day</th>
                    <th className="px-2 py-2 text-left font-semibold text-muted-foreground">Start</th>
                    <th className="px-2 py-2 text-left font-semibold text-muted-foreground">End</th>
                    <th className="px-2 py-2 text-left font-semibold text-muted-foreground">Lunch Out</th>
                    <th className="px-2 py-2 text-left font-semibold text-muted-foreground">Lunch In</th>
                    <th className="px-2 py-2 text-right font-semibold text-muted-foreground">Reg</th>
                    <th className="px-2 py-2 text-right font-semibold text-muted-foreground">OT</th>
                    <th className="px-2 py-2 text-right font-semibold text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((d, i) => (
                    <tr key={d.day_name} className={cn("border-b last:border-0", i >= 5 && "bg-muted/20")}>
                      <td className="px-2 py-2">
                        <div>
                          <p className="font-medium text-xs">{d.day_name}</p>
                          <p className="text-[10px] text-muted-foreground">{d.day_date}</p>
                        </div>
                      </td>
                      <td className="px-1 py-1"><Input type="time" value={d.start_time} onChange={e => updateDay(i, "start_time", e.target.value)} className="h-8 text-xs w-24" /></td>
                      <td className="px-1 py-1"><Input type="time" value={d.end_time} onChange={e => updateDay(i, "end_time", e.target.value)} className="h-8 text-xs w-24" /></td>
                      <td className="px-1 py-1"><Input type="time" value={d.lunch_start} onChange={e => updateDay(i, "lunch_start", e.target.value)} className="h-8 text-xs w-24" /></td>
                      <td className="px-1 py-1"><Input type="time" value={d.lunch_end} onChange={e => updateDay(i, "lunch_end", e.target.value)} className="h-8 text-xs w-24" /></td>
                      <td className="px-2 py-2 text-right font-mono text-xs">{d.regular_hours}</td>
                      <td className="px-2 py-2 text-right font-mono text-xs">{d.overtime_hours > 0 ? d.overtime_hours : "—"}</td>
                      <td className="px-2 py-2 text-right font-mono text-xs font-semibold">{d.total_hours}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-semibold">
                    <td colSpan={5} className="px-2 py-2 text-right text-muted-foreground">Totals</td>
                    <td className="px-2 py-2 text-right font-mono text-xs">{totalRegular}</td>
                    <td className="px-2 py-2 text-right font-mono text-xs">{totalOvertime > 0 ? totalOvertime : "—"}</td>
                    <td className="px-2 py-2 text-right font-mono text-xs">{totalWeekHours}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div>
              <Label htmlFor="equipment">Equipment Required</Label>
              <Input id="equipment" placeholder="e.g. Wire strippers, multimeter" value={form.equipment_required} onChange={e => setForm({ ...form, equipment_required: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" placeholder="Special instructions…" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="mt-1" rows={3} />
            </div>
          </div>
        )}

        {/* Step 3: Requirements */}
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

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Review Weekly Ticket</h3>
            <div className="grid gap-3 text-sm">
              {[
                ["Client", selectedClient?.company_name],
                ["Site", selectedSite?.site_name || selectedSite?.address_line1],
                ["Worker", selectedWorker ? `${selectedWorker.first_name} ${selectedWorker.last_name}` : undefined],
                ["Week", `${form.week_start} → ${weekEnd}`],
                ["Total Hours", `${totalWeekHours}h (${totalRegular} reg + ${totalOvertime} OT)`],
                ["Job Title", form.job_title],
                ["PPE", [form.hard_hat && "Hard Hat", form.boots && "Boots", form.glasses && "Glasses", form.gloves && "Gloves", form.vest && "Vest"].filter(Boolean).join(", ") || "None"],
              ].map(([label, val]) => (
                <div key={label as string} className="flex justify-between border-b pb-2 last:border-0">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-right max-w-[60%]">{(val as string) || "—"}</span>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">Daily Breakdown</h4>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="px-3 py-2 text-left">Day</th>
                      <th className="px-3 py-2 text-left">Time</th>
                      <th className="px-3 py-2 text-right">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {days.filter(d => d.total_hours > 0).map(d => (
                      <tr key={d.day_name} className="border-b last:border-0">
                        <td className="px-3 py-1.5 font-medium">{d.day_name}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{d.start_time} – {d.end_time}</td>
                        <td className="px-3 py-1.5 text-right font-mono font-semibold">{d.total_hours}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
             <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
              <FileText className="mr-1 h-4 w-4" /> Save Draft
            </Button>
            <Button onClick={() => handleSave(true)} disabled={saving}>
              <Send className="mr-1 h-4 w-4" /> Send for Signature
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
