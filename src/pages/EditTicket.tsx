import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, FileText, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useClients, useClientSites, useWorkers } from "@/hooks/use-agency-data";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthGuardedAction } from "@/hooks/use-auth-guarded-action";
import { addDays, format, parseISO } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

interface DayEntry {
  id?: string;
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

function calcHours(start: string, end: string, lunchStart: string, lunchEnd: string) {
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

const steps = [
  { label: "Client & Site", description: "Select client and work site" },
  { label: "Worker", description: "Assign a worker" },
  { label: "Job Details", description: "Title, equipment, times" },
  { label: "Requirements", description: "PPE and logistics" },
  { label: "Review", description: "Review and save or resend" },
];

export default function EditTicket() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const guard = useAuthGuardedAction();
  const { agencyId, user } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("tickets").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: existingDays } = useQuery({
    queryKey: ["ticket-days", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("ticket_days").select("*").eq("ticket_id", id!).order("day_date");
      if (error) throw error;
      return data;
    },
    enabled: !!id && ticket?.ticket_type === "weekly",
  });

  const [form, setForm] = useState({
    client_id: "",
    site_id: "",
    worker_id: "",
    job_title: "",
    equipment_required: "",
    equipment_provided: false,
    start_time: "07:00",
    date: new Date().toISOString().slice(0, 10),
    week_start: "",
    lunch: false,
    transportation: false,
    hard_hat: true,
    boots: true,
    gloves: false,
    glasses: true,
    vest: true,
    notes: "",
  });

  const [days, setDays] = useState<DayEntry[]>([]);

  // Load ticket data into form
  useEffect(() => {
    if (ticket && !loaded) {
      setForm({
        client_id: ticket.client_id,
        site_id: ticket.site_id || "",
        worker_id: ticket.worker_id,
        job_title: ticket.job_title || "",
        equipment_required: ticket.equipment_required || "",
        equipment_provided: ticket.equipment_provided,
        start_time: ticket.start_time || "07:00",
        date: ticket.work_date || new Date().toISOString().slice(0, 10),
        week_start: ticket.week_start_date || "",
        lunch: ticket.lunch_required,
        transportation: ticket.transportation_provided,
        hard_hat: ticket.hard_hat_required,
        boots: ticket.boots_required,
        gloves: ticket.gloves_required,
        glasses: ticket.glasses_required,
        vest: ticket.vest_required,
        notes: ticket.notes || "",
      });
      setLoaded(true);
    }
  }, [ticket, loaded]);

  // Load existing days for weekly
  useEffect(() => {
    if (existingDays && existingDays.length > 0 && days.length === 0) {
      setDays(existingDays.map(d => ({
        id: d.id,
        day_name: d.day_name || "",
        day_date: d.day_date,
        start_time: d.start_time || "",
        end_time: d.end_time || "",
        lunch_start: d.lunch_start || "",
        lunch_end: d.lunch_end || "",
        regular_hours: Number(d.regular_hours),
        overtime_hours: Number(d.overtime_hours),
        total_hours: Number(d.total_hours),
      })));
    }
  }, [existingDays]);

  const { data: clients } = useClients();
  const { data: sites } = useClientSites(form.client_id || undefined);
  const { data: workers } = useWorkers();

  const selectedClient = clients?.find(c => c.id === form.client_id);
  const selectedSite = sites?.find(s => s.id === form.site_id);
  const selectedWorker = workers?.find(w => w.id === form.worker_id);
  const isWeekly = ticket?.ticket_type === "weekly";

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

  const handleSave = async (andSend: boolean) => {
    if (!agencyId || !selectedClient || !selectedWorker || !ticket) return;
    setSaving(true);
    try {
      const siteAddr = selectedSite
        ? [selectedSite.address_line1, selectedSite.city, selectedSite.state].filter(Boolean).join(", ")
        : null;

      // Save edits — always save as corrected when the ticket was rejected, otherwise keep draft
      const newStatus = ticket.status === "rejected" ? "corrected" : "draft";
      const updateData: Record<string, any> = {
        client_id: form.client_id,
        site_id: form.site_id || null,
        worker_id: form.worker_id,
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
        status: newStatus,
        rejection_reason: null,
        rejected_at: null,
        version_number: ticket.version_number + 1,
        updated_at: new Date().toISOString(),
      };

      if (isWeekly) {
        updateData.total_hours = totalWeekHours;
      } else {
        updateData.work_date = form.date;
        updateData.start_time = form.start_time;
      }

      const { error } = await supabase.from("tickets").update(updateData as any).eq("id", id!);
      if (error) throw error;

      // Update weekly days
      if (isWeekly && days.length > 0) {
        for (const d of days) {
          if (d.id) {
            await supabase.from("ticket_days").update({
              start_time: d.start_time || null,
              end_time: d.end_time || null,
              lunch_start: d.lunch_start || null,
              lunch_end: d.lunch_end || null,
              regular_hours: d.regular_hours,
              overtime_hours: d.overtime_hours,
              total_hours: d.total_hours,
            }).eq("id", d.id);
          }
        }
      }

      // If sending, use the secure send-ticket edge function
      if (andSend) {
        const { error: sendErr } = await supabase.functions.invoke("send-ticket", {
          body: { ticket_id: id },
        });
        if (sendErr) throw sendErr;
      }

      toast.success(andSend ? "Ticket resent for signature" : "Draft updated");
      qc.invalidateQueries({ queryKey: ["ticket", id] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      navigate(`/tickets/${id}`);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!ticket || !["draft", "rejected", "corrected"].includes(ticket.status)) {
    return <div className="py-24 text-center text-muted-foreground">Ticket cannot be edited (status: {ticket?.status || "not found"}).</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit {isWeekly ? "Weekly" : "Daily"} Ticket</h1>
          <p className="text-sm text-muted-foreground font-mono">{ticket.ticket_number}</p>
          {ticket.rejection_reason && (
            <p className="text-xs text-destructive mt-1">Rejected: {ticket.rejection_reason}</p>
          )}
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
                  </button>
                ))}
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
                      <p className="font-semibold">{s.site_name || s.address_line1}</p>
                    </button>
                  ))}
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
                  <p className="text-xs text-muted-foreground">{w.trade || "No trade"}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {!isWeekly ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label>Start Time</Label>
                    <Input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label>Job Title</Label>
                  <Input value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Equipment Required</Label>
                  <Input value={form.equipment_required} onChange={e => setForm({ ...form, equipment_required: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="mt-1" rows={3} />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label>Job Title</Label>
                  <Input value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })} className="mt-1" />
                </div>
                {days.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-2 py-2 text-left font-semibold text-muted-foreground w-24">Day</th>
                          <th className="px-2 py-2 text-left font-semibold text-muted-foreground">Start</th>
                          <th className="px-2 py-2 text-left font-semibold text-muted-foreground">End</th>
                          <th className="px-2 py-2 text-left font-semibold text-muted-foreground">Lunch Out</th>
                          <th className="px-2 py-2 text-left font-semibold text-muted-foreground">Lunch In</th>
                          <th className="px-2 py-2 text-right font-semibold text-muted-foreground">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {days.map((d, i) => (
                          <tr key={d.day_name} className="border-b last:border-0">
                            <td className="px-2 py-2 font-medium text-xs">{d.day_name}<br/><span className="text-muted-foreground">{d.day_date}</span></td>
                            <td className="px-1 py-1"><Input type="time" value={d.start_time} onChange={e => updateDay(i, "start_time", e.target.value)} className="h-8 text-xs w-24" /></td>
                            <td className="px-1 py-1"><Input type="time" value={d.end_time} onChange={e => updateDay(i, "end_time", e.target.value)} className="h-8 text-xs w-24" /></td>
                            <td className="px-1 py-1"><Input type="time" value={d.lunch_start} onChange={e => updateDay(i, "lunch_start", e.target.value)} className="h-8 text-xs w-24" /></td>
                            <td className="px-1 py-1"><Input type="time" value={d.lunch_end} onChange={e => updateDay(i, "lunch_end", e.target.value)} className="h-8 text-xs w-24" /></td>
                            <td className="px-2 py-2 text-right font-mono text-xs font-semibold">{d.total_hours}h</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 font-semibold">
                          <td colSpan={5} className="px-2 py-2 text-right text-muted-foreground">Total</td>
                          <td className="px-2 py-2 text-right font-mono text-xs">{totalWeekHours}h</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
                <div>
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="mt-1" rows={3} />
                </div>
              </>
            )}
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
            <h3 className="font-semibold">Review Changes</h3>
            <div className="grid gap-3 text-sm">
              {[
                ["Client", selectedClient?.company_name],
                ["Worker", selectedWorker ? `${selectedWorker.first_name} ${selectedWorker.last_name}` : "—"],
                ["Site", selectedSite?.site_name || selectedSite?.address_line1 || "—"],
                isWeekly ? ["Total Hours", `${totalWeekHours}h`] : ["Date", form.date],
                ["Job Title", form.job_title || "—"],
                ["PPE", [form.hard_hat && "Hard Hat", form.boots && "Boots", form.glasses && "Glasses", form.gloves && "Gloves", form.vest && "Vest"].filter(Boolean).join(", ") || "None"],
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
              <Send className="mr-1 h-4 w-4" /> Resend for Signature
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
