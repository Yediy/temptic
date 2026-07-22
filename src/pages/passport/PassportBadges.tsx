import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";
import { useBadges } from "@/hooks/passport/use-workforce-passport";
import { LoadingState } from "@/components/woic/AsyncState";

const TIER_CLASS: Record<string, string> = {
  bronze: "border-amber-700/40 bg-amber-700/10 text-amber-800",
  silver: "border-slate-400/40 bg-slate-400/10 text-slate-700",
  gold: "border-yellow-500/40 bg-yellow-500/10 text-yellow-800",
  platinum: "border-primary/40 bg-primary/10 text-primary",
};

export default function PassportBadges() {
  const { passportId } = useParams();
  const { data, isLoading } = useBadges(passportId);
  if (isLoading) return <LoadingState />;
  const badges = data ?? [];

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Earned Badges</CardTitle></CardHeader>
      <CardContent>
        {badges.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No badges yet. Badges are awarded automatically as you build reliability, safety, and completion history.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {badges.map((b) => (
              <div
                key={b.id}
                className={`rounded-lg border p-3 flex gap-3 items-start ${TIER_CLASS[b.tier ?? ""] ?? "border-border"}`}
              >
                <Award className="h-6 w-6 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="font-medium flex items-center gap-2 flex-wrap">
                    <span className="truncate">{b.name}</span>
                    {b.tier && <Badge variant="outline" className="uppercase text-[10px]">{b.tier}</Badge>}
                  </div>
                  {b.description && <div className="text-xs mt-1 opacity-90">{b.description}</div>}
                  <div className="text-[11px] mt-1 opacity-70">
                    {b.awarded_by ? `Awarded by ${b.awarded_by} · ` : ""}
                    {new Date(b.awarded_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
