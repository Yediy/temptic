import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

type Site = { id: string; site_name: string; site_code: string | null; city: string | null; state: string | null };

export default function SiteQrCodes() {
  const { data: sites, isLoading } = useQuery({
    queryKey: ["site-qr-sites"],
    queryFn: async () => {
      const { data, error } = await supabase.from("client_sites").select("id,site_name,site_code,city,state").eq("is_active", true).order("site_name");
      if (error) throw error;
      return (data ?? []) as Site[];
    },
  });
  const origin = window.location.origin;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">Print and post these at each site. Workers scan with their phone camera to clock in or out.</p>
        <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Print</Button>
      </div>
      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {!isLoading && !sites?.length && <Card className="p-6 text-center text-sm text-muted-foreground">No active sites yet.</Card>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sites?.map((s) => (
          <Card key={s.id} className="p-4 flex flex-col items-center gap-2 break-inside-avoid">
            <div className="rounded-md bg-card p-2">
              <QRCodeSVG value={`${origin}/worker/checkin/${s.id}`} size={180} level="M" />
            </div>
            <div className="font-semibold text-center">{s.site_name}</div>
            <div className="text-xs text-muted-foreground">{[s.site_code, s.city, s.state].filter(Boolean).join(" · ")}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
