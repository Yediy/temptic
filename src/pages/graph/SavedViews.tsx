import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/woic/AsyncState";
import { SAVED_VIEWS_KEY, readJson, writeJson, domainByKey, modeByKey, type SavedGraphView } from "@/lib/graph/platform";
import { Trash2 } from "lucide-react";

export default function SavedViews() {
  const [views, setViews] = useState<SavedGraphView[]>(() => {
    const raw = readJson<SavedGraphView[]>(SAVED_VIEWS_KEY, [] as SavedGraphView[]);
    return Array.isArray(raw) ? raw : [];
  });

  const remove = (id: string) => {
    const next = views.filter((v) => v.id !== id);
    setViews(next);
    writeJson(SAVED_VIEWS_KEY, next);
  };

  return (
    <Card className="bg-card/60 backdrop-blur">
      <CardHeader className="pb-2"><CardTitle className="text-sm">Saved views ({views.length})</CardTitle></CardHeader>
      <CardContent>
        {views.length === 0 ? (
          <EmptyState label="No saved views yet — configure a domain graph and press Save." />
        ) : (
          <ul className="space-y-1 text-sm">
            {views.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-2 border-b py-1.5">
                <Link to={`/graph/domain/${v.domain}`} className="min-w-0 flex-1 truncate hover:text-primary">
                  {v.name}
                </Link>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px]">{domainByKey(v.domain).label}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{modeByKey(v.mode).label}</Badge>
                  {v.asOf && <span>as of {v.asOf}</span>}
                  <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Delete view"
                    onClick={() => remove(v.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
