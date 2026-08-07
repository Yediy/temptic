import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth";
import {
  useKnowledgeAnalytics,
  useKnowledgeArticles,
  useKnowledgeWorkspaceState,
} from "@/hooks/knowledge/use-knowledge";
import { fmtDate } from "@/components/woic/DataPanel";
import { STATUS_TONE } from "@/lib/knowledge/taxonomy";

function ArticleLinks({ ids, empty }: { ids: { id: string; title: string; status: string }[]; empty: string }) {
  if (ids.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="space-y-1.5">
      {ids.map((a) => (
        <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
          <Link to="/knowledge/base" className="line-clamp-1 hover:underline">{a.title}</Link>
          <Badge variant={STATUS_TONE[a.status] ?? "outline"} className="text-[10px]">{a.status}</Badge>
        </li>
      ))}
    </ul>
  );
}

export default function KnowledgeHome() {
  const { agencyId } = useAuth();
  const { data: articles = [], isLoading } = useKnowledgeArticles(agencyId ?? undefined);
  const ws = useKnowledgeWorkspaceState();
  const analytics = useKnowledgeAnalytics(articles, ws.recents);

  const byId = new Map(articles.map((a) => [a.id, a]));
  const recent = ws.recents.map((id) => byId.get(id)).filter(Boolean) as typeof articles;
  const pending = articles.filter((a) => a.status === "review" || a.status === "draft").slice(0, 6);
  const recommended = articles.filter((a) => a.status === "published" || a.status === "approved").slice(0, 6);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1 bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Knowledge Health</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="text-3xl font-semibold">{analytics.healthScore}%</div>
          <Progress value={analytics.healthScore} />
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <span>{analytics.total} total</span>
            <span>{analytics.published} published</span>
            <span>{analytics.inReview} in review</span>
            <span>{analytics.stale} stale (90d+)</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Recently Viewed</CardTitle></CardHeader>
        <CardContent><ArticleLinks ids={recent.slice(0, 6)} empty="Nothing viewed yet." /></CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Recommended Knowledge</CardTitle></CardHeader>
        <CardContent><ArticleLinks ids={recommended} empty={isLoading ? "Loading…" : "No published knowledge yet."} /></CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Pending Reviews</CardTitle></CardHeader>
        <CardContent><ArticleLinks ids={pending} empty="Nothing awaiting review." /></CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Updates</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-1.5 text-sm">
            {analytics.recentlyUpdated.map((a) => (
              <li key={a.id} className="flex justify-between gap-2">
                <span className="line-clamp-1">{a.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{fmtDate(a.updated_at)}</span>
              </li>
            ))}
            {analytics.recentlyUpdated.length === 0 && <p className="text-muted-foreground">No updates yet.</p>}
          </ul>
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Trending Topics</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-1.5">
          {analytics.topTags.map((t) => (
            <Badge key={t.tag} variant="outline" className="text-[11px]">{t.tag} · {t.count}</Badge>
          ))}
          {analytics.topTags.length === 0 && <p className="text-sm text-muted-foreground">No tags yet.</p>}
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Saved Collections</CardTitle></CardHeader>
        <CardContent>
          {ws.collections.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No collections yet — build one in <Link to="/knowledge/collections" className="underline">Collections</Link>.
            </p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {ws.collections.slice(0, 6).map((c) => (
                <li key={c.id} className="flex justify-between">
                  <Link to="/knowledge/collections" className="hover:underline">{c.name}</Link>
                  <span className="text-xs text-muted-foreground">{c.articleIds.length}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Organization Highlights</CardTitle></CardHeader>
        <CardContent className="space-y-1.5 text-sm text-muted-foreground">
          {analytics.byKind.map((k) => (
            <div key={k.kind} className="flex justify-between">
              <span className="capitalize">{k.kind}</span><span>{k.count}</span>
            </div>
          ))}
          {analytics.byKind.length === 0 && <p>No knowledge classified yet.</p>}
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">AI Recommendations</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Run cognitive analysis over the corpus in{" "}
          <Link to="/knowledge/insights" className="underline">AI Insights</Link> — gaps, contradictions and
          suggested knowledge are generated by WOIC on demand.
        </CardContent>
      </Card>
    </div>
  );
}
