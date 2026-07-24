import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState, EmptyState, ErrorState } from "@/components/woic/AsyncState";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useAgencyTwins } from "@/hooks/use-twin";

export default function TwinOrganization() {
  const { agencyId } = useAuth();
  const q = useAgencyTwins(agencyId ?? undefined);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Organizational Twin — Workforce Capability</CardTitle></CardHeader>
      <CardContent>
        {q.isLoading ? <LoadingState /> :
         q.error ? <ErrorState error={q.error} /> :
         !q.data?.length ? <EmptyState label="No worker twins built yet." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2">Worker</th>
                  <th className="py-2">Health</th>
                  <th className="py-2">Growth</th>
                  <th className="py-2">Potential</th>
                  <th className="py-2">Risks</th>
                </tr>
              </thead>
              <tbody>
                {q.data.map((t: any) => {
                  const risks = Object.keys(t.risk_indicators ?? {});
                  const name = t.workers ? `${t.workers.first_name ?? ""} ${t.workers.last_name ?? ""}`.trim() : t.worker_id.slice(0, 8);
                  return (
                    <tr key={t.id} className="border-t">
                      <td className="py-2">
                        <Link to={`/twin/${t.worker_id}`} className="text-primary hover:underline">{name || "Unnamed"}</Link>
                      </td>
                      <td className="py-2">{t.career_health ?? "—"}</td>
                      <td className="py-2">{t.growth_score ?? "—"}</td>
                      <td className="py-2">{t.future_potential ?? "—"}</td>
                      <td className="py-2">
                        {risks.length === 0 ? <span className="text-muted-foreground">—</span> :
                          risks.slice(0, 3).map((r) => <Badge key={r} variant="outline" className="mr-1">{r}</Badge>)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
         )}
      </CardContent>
    </Card>
  );
}
