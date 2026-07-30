import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow, format } from "date-fns";
import { RefreshCw } from "lucide-react";
import { useLiveEventStream } from "@/hooks/oic/use-oic";

export default function LiveEventStreamPage() {
  const { events, connected, refresh } = useLiveEventStream(120);
  const [q, setQ] = useState("");

  const filtered = events.filter((e) => {
    const hay = `${e.name} ${e.module} ${e.entity_type ?? ""}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Platform event stream</CardTitle>
          <Badge variant={connected ? "default" : "outline"}>{connected ? "live" : "polling"}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter events…" className="h-8 w-52" />
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {filtered.map((e) => (
          <div key={e.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{e.name}</code>
                <Badge variant="outline" className="text-[10px]">
                  {e.module}
                </Badge>
                {e.status && <span className="text-[11px] text-muted-foreground">{e.status}</span>}
              </div>
              {e.entity_type && (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {e.entity_type} · {e.entity_id}
                </p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</p>
              <p className="text-[11px] text-muted-foreground">{format(new Date(e.created_at), "MMM d HH:mm:ss")}</p>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No events match. Operational events stream in as modules emit them.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
