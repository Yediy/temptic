import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTtoPunches } from "@/hooks/tto/use-tto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Camera, MapPin, Receipt, Car, Trash2, Check, X, Paperclip } from "lucide-react";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
type Kind = "photo" | "gps" | "expense" | "mileage";
type Evidence = {
  id: string; kind: Kind; time_entry_id: string | null; photo_path: string | null;
  latitude: number | null; longitude: number | null; accuracy_m: number | null;
  category: string | null; amount: number | null; miles: number | null; rate_per_mile: number | null;
  mileage_total: number | null; note: string | null; status: string; captured_at: string; created_by: string;
};

const ICON = { photo: Camera, gps: MapPin, expense: Receipt, mileage: Car };
const LABEL: Record<string, string> = { clock_in: "Clock in", clock_out: "Clock out", break_start: "Break start", break_end: "Break end" };

function getPosition(): Promise<GeolocationPosition | null> {
  return new Promise((r) => {
    if (!navigator.geolocation) return r(null);
    navigator.geolocation.getCurrentPosition(r, () => r(null), { timeout: 8000, enableHighAccuracy: true });
  });
}

export function TicketEvidencePanel({ ticketId, mode }: { ticketId: string; mode: "worker" | "reviewer" }) {
  const qc = useQueryClient();
  const { data: punches } = useTtoPunches(ticketId);
  const key = ["tto-evidence", ticketId];
  const { data: items } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("tto_ticket_evidence" as Any).select("*").eq("time_ticket_id", ticketId).order("captured_at");
      if (error) throw error;
      return (data ?? []) as unknown as Evidence[];
    },
  });

  const [open, setOpen] = useState<Kind | null>(null);
  const [eventId, setEventId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [miles, setMiles] = useState("");
  const [rate, setRate] = useState("0.70");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const reset = () => { setOpen(null); setFile(null); setCategory(""); setAmount(""); setMiles(""); setNote(""); };

  const add = async () => {
    if (!open) return;
    setBusy(true);
    try {
      const row: Record<string, unknown> = { time_ticket_id: ticketId, kind: open, time_entry_id: eventId || null, note: note || null };
      const pos = await getPosition();
      if (pos) Object.assign(row, { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy_m: pos.coords.accuracy });
      if (open === "gps" && !pos) throw new Error("Location unavailable — allow location access and try again");
      if (open === "photo" || (open === "expense" && file)) {
        if (!file) throw new Error("Choose a photo");
        const { data: u } = await supabase.auth.getUser();
        const path = `${u.user?.id}/${ticketId}/evidence-${crypto.randomUUID()}.${file.name.split(".").pop() || "jpg"}`;
        const { error } = await supabase.storage.from("punch-photos").upload(path, file, { contentType: file.type });
        if (error) throw error;
        row.photo_path = path;
      }
      if (open === "expense") { if (!amount) throw new Error("Enter an amount"); row.amount = Number(amount); row.category = category || "other"; }
      if (open === "mileage") { if (!miles) throw new Error("Enter miles"); row.miles = Number(miles); row.rate_per_mile = Number(rate) || 0; row.category = "mileage"; }
      const { error } = await supabase.from("tto_ticket_evidence" as Any).insert(row);
      if (error) throw error;
      toast.success("Evidence added");
      reset();
      qc.invalidateQueries({ queryKey: key });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not add"); }
    finally { setBusy(false); }
  };

  const mutate = useMutation({
    mutationFn: async (a: { id: string; op: "delete" | "approved" | "rejected" }) => {
      const q = supabase.from("tto_ticket_evidence" as Any);
      const { error } = a.op === "delete" ? await q.delete().eq("id", a.id) : await q.update({ status: a.op }).eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const viewPhoto = async (path: string) => {
    const { data, error } = await supabase.storage.from("punch-photos").createSignedUrl(path, 300);
    if (error || !data) return toast.error("Photo unavailable");
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const expenseTotal = (items ?? []).filter((i) => i.status !== "rejected")
    .reduce((s, i) => s + Number(i.kind === "mileage" ? i.mileage_total ?? 0 : i.kind === "expense" ? i.amount ?? 0 : 0), 0);
  const eventName = (id: string | null) => {
    const p = punches?.find((x) => x.id === id);
    return p ? `${LABEL[String(p.kind)] ?? p.kind} ${new Date(String(p.occurred_at)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Whole ticket";
  };

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium flex items-center gap-1.5"><Paperclip className="h-3.5 w-3.5" />Evidence & expenses</div>
        {expenseTotal > 0 && <span className="text-xs text-muted-foreground">Claimed ${expenseTotal.toFixed(2)}</span>}
      </div>

      {(items ?? []).length === 0 && <p className="text-xs text-muted-foreground">Nothing attached yet.</p>}
      {(items ?? []).map((i) => {
        const Icon = ICON[i.kind];
        return (
          <div key={i.id} className="flex items-start gap-2 text-xs border-t pt-2">
            <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="font-medium">
                {i.kind === "expense" && `${i.category ?? "Expense"} · $${Number(i.amount).toFixed(2)}`}
                {i.kind === "mileage" && `${i.miles} mi × $${i.rate_per_mile}/mi = $${Number(i.mileage_total).toFixed(2)}`}
                {i.kind === "photo" && "Photo"}
                {i.kind === "gps" && "GPS location"}
                <span className="text-muted-foreground font-normal"> · {eventName(i.time_entry_id)}</span>
              </div>
              {i.note && <div className="text-muted-foreground">{i.note}</div>}
              <div className="flex flex-wrap gap-2 text-muted-foreground">
                <span>{new Date(i.captured_at).toLocaleString()}</span>
                {i.latitude != null && (
                  <a className="underline" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps?q=${i.latitude},${i.longitude}`}>
                    {Number(i.latitude).toFixed(5)}, {Number(i.longitude).toFixed(5)}{i.accuracy_m ? ` ±${Math.round(Number(i.accuracy_m))}m` : ""}
                  </a>
                )}
                {i.photo_path && <button className="underline" onClick={() => viewPhoto(i.photo_path!)}>{i.kind === "expense" ? "View receipt" : "View photo"}</button>}
              </div>
            </div>
            <Badge variant={i.status === "approved" ? "default" : i.status === "rejected" ? "destructive" : "secondary"} className="text-[10px]">{i.status}</Badge>
            {mode === "reviewer" && i.status === "pending" && (
              <>
                <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Approve" onClick={() => mutate.mutate({ id: i.id, op: "approved" })}><Check className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Reject" onClick={() => mutate.mutate({ id: i.id, op: "rejected" })}><X className="h-3.5 w-3.5" /></Button>
              </>
            )}
            {mode === "worker" && i.status === "pending" && (
              <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Remove" onClick={() => mutate.mutate({ id: i.id, op: "delete" })}><Trash2 className="h-3.5 w-3.5" /></Button>
            )}
          </div>
        );
      })}

      {mode === "worker" && (
        <>
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {(["photo", "gps", "expense", "mileage"] as Kind[]).map((k) => {
              const Icon = ICON[k];
              return <Button key={k} size="sm" variant={open === k ? "default" : "outline"} onClick={() => setOpen(open === k ? null : k)} className="text-xs capitalize"><Icon className="mr-1 h-3.5 w-3.5" />{k === "gps" ? "GPS" : k}</Button>;
            })}
          </div>
          {open && (
            <div className="space-y-2 pt-1">
              <select className="w-full h-9 rounded-md border bg-background px-2 text-sm" value={eventId} onChange={(e) => setEventId(e.target.value)} aria-label="Attach to">
                <option value="">Whole ticket</option>
                {punches?.map((p) => <option key={String(p.id)} value={String(p.id)}>{eventName(String(p.id))}</option>)}
              </select>
              {(open === "photo" || open === "expense") && (
                <label className="flex items-center gap-2 text-sm cursor-pointer rounded-md border border-dashed p-2">
                  <Camera className="h-4 w-4" />{file ? file.name : open === "expense" ? "Receipt photo (optional)" : "Take or choose photo"}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </label>
              )}
              {open === "expense" && (
                <div className="grid grid-cols-2 gap-2">
                  <select className="h-9 rounded-md border bg-background px-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
                    <option value="">Category…</option>
                    {["meals", "parking", "tolls", "fuel", "tools", "lodging", "other"].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <Input type="number" min="0" step="0.01" placeholder="Amount $" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
              )}
              {open === "mileage" && (
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" min="0" step="0.1" placeholder="Miles" value={miles} onChange={(e) => setMiles(e.target.value)} />
                  <Input type="number" min="0" step="0.01" placeholder="$ per mile" value={rate} onChange={(e) => setRate(e.target.value)} />
                </div>
              )}
              {open === "gps" && <p className="text-xs text-muted-foreground">Your current location will be recorded.</p>}
              <Input placeholder="Note (optional)" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
              <Button size="sm" className="w-full" onClick={add} disabled={busy}>{busy ? "Saving…" : "Attach"}</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
