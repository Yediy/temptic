import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import {
  useKnowledgeAnalytics,
  useKnowledgeArticles,
  useKnowledgeWorkspaceState,
} from "@/hooks/knowledge/use-knowledge";
import { fmtDate } from "@/components/woic/DataPanel";

export default function KnowledgeAnalytics() {
  const { agencyId } = useAuth();
  const { data: articles = [] } = useKnowledgeArticles(agencyId ?? undefined);
  const ws = useKnowledgeWorkspaceState();
  const a = useKnowledgeAnalytics(articles, ws.recents);

  const stats = [
    { label: "Total knowledge", value: a.total },
    { label: "Published", value: a.published },
    { label: "In review", value: a.inReview },
    { label: "Drafts", value: a.drafts },
    { label: "Archived", value: a.archived },
    { label: "Stale (90d+)", value: a.stale },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {stats.map((s) => (
          <Card key={s.label} className="bg-card/60 backdrop-blur">
            <CardContent className="pt-5">
              <p className="text-2xl font-semibold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Knowledge health score</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-semibold">{a.healthScore}%</p>
            <Progress value={a.healthScore} />
            <p className="text-xs text-muted-foreground">
              Weighted by published share, review backlog and content freshness.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Coverage by type</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {a.byKind.map((k) => (
              <div key={k.kind} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="capitalize">{k.kind}</span><span>{k.count}</span>
                </div>
                <Progress value={a.total ? (k.count / a.total) * 100 : 0} className="h-1.5" />
              </div>
            ))}
            {a.byKind.length === 0 && <p className="text-sm text-muted-foreground">No knowledge yet.</p>}
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Most referenced topics</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {a.topTags.map((t) => (
              <Badge key={t.tag} variant="outline" className="text-[11px]">{t.tag} · {t.count}</Badge>
            ))}
            {a.topTags.length === 0 && <p className="text-sm text-muted-foreground">No tags recorded.</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Recently updated knowledge</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {a.recentlyUpdated.map((r) => (
            <div key={r.id} className="flex justify-between gap-2 text-sm">
              <span className="line-clamp-1">{r.title}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{fmtDate(r.updated_at)}</span>
            </div>
          ))}
          {a.recentlyUpdated.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
