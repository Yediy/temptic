import { useAuth } from "@/lib/auth";
import { useMarketplaceOpportunities } from "@/hooks/recruit/use-recruit";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function RecruitMarketplace() {
  const { agencyId } = useAuth();
  const q = useMarketplaceOpportunities(agencyId ?? undefined);

  if (q.isLoading) return <LoadingState />;
  if (q.error) return <ErrorState error={q.error} />;
  if (!q.data?.length) return <EmptyState label="No opportunities published yet." />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {q.data.map((o) => (
        <Card key={o.id}>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              {o.title}
              <Badge variant="outline">{o.kind}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground line-clamp-3">{o.description ?? ""}</p>
            <div className="flex gap-2">
              <Badge variant="secondary">{o.visibility}</Badge>
              {o.expires_at && <Badge variant="outline">Expires {new Date(o.expires_at).toLocaleDateString()}</Badge>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
