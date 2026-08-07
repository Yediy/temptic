import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { useKnowledgeArticles, useSetArticleStatus } from "@/hooks/knowledge/use-knowledge";
import { STATUS_TONE } from "@/lib/knowledge/taxonomy";
import { fmtDate } from "@/components/woic/DataPanel";

export default function KnowledgeApprovals() {
  const { agencyId } = useAuth();
  const { data: articles = [], isLoading } = useKnowledgeArticles(agencyId ?? undefined);
  const setStatus = useSetArticleStatus();

  const queue = articles.filter((a) => a.status === "draft" || a.status === "review");

  return (
    <Card className="bg-card/60 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Approval queue ({queue.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading queue…</p>}
        {!isLoading && queue.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing awaiting approval — the corpus is fully reviewed.</p>
        )}
        {queue.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2">
            <div className="min-w-0">
              <p className="line-clamp-1 text-sm font-medium">{a.title}</p>
              <p className="text-[11px] text-muted-foreground">
                {a.kind} · v{a.version} · updated {fmtDate(a.updated_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={STATUS_TONE[a.status] ?? "outline"} className="text-[10px]">{a.status}</Badge>
              {a.status === "draft" && (
                <Button size="sm" variant="outline" disabled={setStatus.isPending}
                  onClick={() => setStatus.mutate({ id: a.id, status: "review" })}>
                  Send to review
                </Button>
              )}
              <Button size="sm" disabled={setStatus.isPending}
                onClick={() => setStatus.mutate({ id: a.id, status: "published" })}>
                Approve & publish
              </Button>
              <Button size="sm" variant="ghost" disabled={setStatus.isPending}
                onClick={() => setStatus.mutate({ id: a.id, status: "archived" })}>
                Reject
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
