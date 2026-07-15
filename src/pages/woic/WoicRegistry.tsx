import { useAuth } from "@/lib/auth";
import { useWoicRegistryServices, useWoicRegistryApis } from "@/hooks/use-woic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";

export default function WoicRegistry() {
  const { agencyId } = useAuth();
  const services = useWoicRegistryServices(agencyId ?? undefined);
  const apis = useWoicRegistryApis(agencyId ?? undefined);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Services</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {services.isLoading && <LoadingState />}
          {services.error && <ErrorState error={services.error} />}
          {!services.isLoading && !services.error && services.data?.length === 0 && (
            <EmptyState label="No services registered." />
          )}
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
          {apis.isLoading && <LoadingState />}
          {apis.error && <ErrorState error={apis.error} />}
          {!apis.isLoading && !apis.error && apis.data?.length === 0 && (
            <EmptyState label="No APIs registered." />
          )}
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
