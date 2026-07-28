import { useParams } from "react-router-dom";
import { useClientAdvisor } from "@/hooks/cc/use-client-collab";
import { Sparkles } from "lucide-react";

export default function ClientAdvisor() {
  const { clientId } = useParams();
  const { data, isLoading } = useClientAdvisor(clientId);
  const recs = data?.data?.recommendations ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" /> WOIC Client Advisor
      </h2>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      <div className="rounded-xl border bg-card divide-y">
        {recs.map((r) => (
          <div key={r.id} className="px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{r.title ?? r.kind}</p>
              <span className="text-xs text-muted-foreground">score {Math.round((r.score ?? 0) * 100) / 100}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{r.body ?? r.reasoning}</p>
          </div>
        ))}
        {!recs.length && !isLoading && <p className="p-6 text-sm text-muted-foreground">No recommendations yet.</p>}
      </div>
    </div>
  );
}
