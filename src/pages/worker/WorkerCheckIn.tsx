import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type TtoTicket } from "@/hooks/tto/use-tto";
import { useState } from "react";
import { capturePunch } from "@/lib/offline/punch-queue";
import { useOfflinePunches } from "@/hooks/use-offline-punches";
import { Camera } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";
import { TicketEvidencePanel } from "@/components/tto/TicketEvidencePanel";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function getPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 8000, enableHighAccuracy: true });
  });
}

export default function WorkerCheckIn() {
  const { siteId } = useParams();
  const { pending, online } = useOfflinePunches();
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["worker-checkin", siteId],
    enabled: !!siteId,
    queryFn: async () => {
      const { data: site } = await supabase.from("client_sites").select("id,site_name").eq("id", siteId!).maybeSingle();
      const { data: tickets } = await supabase.from("tto_time_tickets" as Any).select("*")
        .eq("site_id", siteId!).in("status", ["open", "in_progress"]).order("work_date", { ascending: false }).limit(5);
      return { site, tickets: (tickets ?? []) as unknown as TtoTicket[] };
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const ticket = data?.tickets.find((t) => t.work_date === today && !t.actual_end) ?? data?.tickets.find((t) => !t.actual_end);
  const queued = pending.filter((p) => p.time_ticket_id === ticket?.id && (p.kind === "clock_in" || p.kind === "clock_out"));
  const lastQueued = queued[queued.length - 1];
  const clockedIn = lastQueued ? lastQueued.kind === "clock_in" : !!ticket?.actual_start;
  const done = lastQueued?.kind === "clock_out";
  const kind: "clock_in" | "clock_out" | null = !ticket || done ? null : !clockedIn ? "clock_in" : "clock_out";

  const go = async () => {
    if (!ticket || !kind) return;
    setBusy(true);
    const pos = await getPosition();
    try {
      await capturePunch({
        time_ticket_id: ticket.id, kind, source: "qr", site_id: siteId,
        latitude: pos?.coords.latitude, longitude: pos?.coords.longitude, accuracy_m: pos?.coords.accuracy,
        photo: photo ?? undefined,
      });
      setPhoto(null);
      toast.success(`${kind === "clock_in" ? "Clocked in" : "Clocked out"}${navigator.onLine ? "" : " — will sync when back online"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save punch");
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Card className="p-6 text-center space-y-4">
        <MapPin className="h-8 w-8 mx-auto text-primary" />
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : !data?.site ? (
          <p className="text-sm text-muted-foreground">This QR code isn't linked to a site you're assigned to.</p>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-semibold">{data.site.site_name}</h2>
              <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString()}</p>
            </div>
            {!ticket ? (
              <p className="text-sm text-muted-foreground">You have no open shift at this site. Contact your supervisor.</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {done ? "Clocked out — waiting to sync" : lastQueued ? `Clocked in at ${new Date(lastQueued.occurred_at).toLocaleTimeString()} (saved on device)` : ticket.actual_start ? `Clocked in at ${new Date(ticket.actual_start).toLocaleTimeString()}` : "Not clocked in yet"}
                </p>
                {!online && <p className="text-xs text-muted-foreground">You're offline. Your punch will be saved and sent automatically.</p>}
                {kind && (
                  <label className="flex items-center justify-center gap-2 text-sm cursor-pointer rounded-md border border-dashed p-3">
                    <Camera className="h-4 w-4" />
                    {photo ? `Photo attached: ${photo.name}` : "Add a site photo (optional)"}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
                  </label>
                )}
                <Button size="lg" className="w-full h-16 text-lg" variant={kind === "clock_out" ? "destructive" : "default"} onClick={go} disabled={busy || !kind}>
                  {!kind ? "Shift complete" : kind === "clock_in" ? <><LogIn className="mr-2 h-5 w-5" />Clock In</> : <><LogOut className="mr-2 h-5 w-5" />Clock Out</>}
                </Button>
                {online && <div className="text-left"><TicketEvidencePanel ticketId={ticket.id} mode="worker" /></div>}
              </>
            )}
          </>
        )}
        <Link to="/worker" className="block text-xs text-muted-foreground underline">Back to my tickets</Link>
      </Card>
    </div>
  );
}
