import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useRecentSearches, useSavedTimelineViews } from "@/hooks/timeline/use-timeline";
import { TIMELINE_SCOPES } from "@/lib/timeline/scopes";

export default function TimelineSavedViews() {
  const { views, setViews } = useSavedTimelineViews();
  const { recent, clear } = useRecentSearches();
  const navigate = useNavigate();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Saved views</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {views.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No saved views yet. Use “Save view” on any timeline to store its filters.
            </p>
          )}
          {views.map((v) => {
            const scope = TIMELINE_SCOPES.find((s) => s.key === v.scope);
            return (
              <div key={v.id} className="flex items-center justify-between gap-2 rounded-md border p-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{v.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {scope?.label ?? v.scope} · {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => navigate(scope?.path ?? "/timeline")}>
                    Open
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Delete ${v.name}`}
                    onClick={() => setViews((p) => p.filter((x) => x.id !== v.id))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Recent searches</CardTitle>
          {recent.length > 0 && (
            <Button size="sm" variant="ghost" onClick={clear}>
              Clear
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex flex-wrap gap-1.5">
          {recent.length === 0 && <p className="text-sm text-muted-foreground">No recent searches.</p>}
          {recent.map((r) => (
            <Badge key={r} variant="outline" className="text-[11px]">
              {r}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
