import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTtoPunch, type TtoTicket } from "@/hooks/tto/use-tto";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";

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
  const punch = useTtoPunch();

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
  const kind: "clock_in" | "clock_out" | null = !ticket ? null : !ticket.actual_start ? "clock_in" : "clock_out";

  const go = async () => {
    if (!ticket || !kind) return;
    const pos = await getPosition();
    try {
      await punch.mutateAsync({
        time_ticket_id: ticket.id, kind, source: "qr",
        latitude: pos?.coords.latitude, longitude: pos?.coords.longitude, accuracy_m: pos?.coords.accuracy,
        site_id: siteId,
      } as Any);
      toast.success(kind === "clock_in" ? "Clocked in" : "Clocked out");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Check-in failed");
    }
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
                  {ticket.actual_start ? `Clocked in at ${new Date(ticket.actual_start).toLocaleTimeString()}` : "Not clocked in yet"}
                </p>
                <Button size="lg" className="w-full h-16 text-lg" variant={kind === "clock_out" ? "destructive" : "default"} onClick={go} disabled={punch.isPending}>
                  {kind === "clock_in" ? <><LogIn className="mr-2 h-5 w-5" />Clock In</> : <><LogOut className="mr-2 h-5 w-5" />Clock Out</>}
                </Button>
              </>
            )}
          </>
        )}
        <Link to="/worker" className="block text-xs text-muted-foreground underline">Back to my tickets</Link>
      </Card>
    </div>
  );
}
