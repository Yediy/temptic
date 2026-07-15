import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function WoicRegistry() {
  const services = useQuery({
    queryKey: ["woic", "service_registry"],
    queryFn: async () => {
      const { data, error } = await supabase.from("woic_service_registry").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const apis = useQuery({
    queryKey: ["woic", "api_registry"],
    queryFn: async () => {
      const { data, error } = await supabase.from("woic_api_registry").select("*").order("path");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Services</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {services.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {services.data?.map((s: any) => (
            <div key={s.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">{s.name}</p>
                <Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{s.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>API Endpoints</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {apis.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {apis.data?.map((a: any) => (
            <div key={a.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs">{a.method} {a.path}</p>
                <Badge variant="outline">{a.auth ?? "user"}</Badge>
              </div>
              {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
