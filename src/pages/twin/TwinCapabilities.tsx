import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState, EmptyState, ErrorState } from "@/components/woic/AsyncState";
import { useTwinCapabilities } from "@/hooks/use-twin";
import { useTwinCtx } from "./twin-context";

export default function TwinCapabilities() {
  const { twinId } = useTwinCtx();
  const q = useTwinCapabilities(twinId);
  const grouped = (q.data ?? []).reduce<Record<string, typeof q.data extends Array<infer T> ? T[] : never>>((acc, c: any) => {
    (acc[c.kind] ??= []).push(c);
    return acc;
  }, {} as any);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Capability Graph</CardTitle></CardHeader>
      <CardContent>
        {q.isLoading ? <LoadingState /> :
         q.error ? <ErrorState error={q.error} /> :
         !q.data?.length ? <EmptyState label="No capabilities modeled yet." /> : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([kind, items]: [string, any[]]) => (
              <div key={kind}>
                <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">{kind}</p>
                <div className="flex flex-wrap gap-2">
                  {items.map((c) => (
                    <Badge key={c.id} variant="secondary" className="text-xs">
                      {c.label}
                      {typeof c.proficiency === "number" ? ` · ${Math.round(c.proficiency)}` : ""}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
         )}
      </CardContent>
    </Card>
  );
}
