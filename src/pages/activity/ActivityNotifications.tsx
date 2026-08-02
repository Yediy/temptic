import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFabricNotifications } from "@/hooks/activity/use-event-fabric";

export default function ActivityNotifications() {
  const { data: rows = [], isLoading } = useFabricNotifications();
  const [q, setQ] = useState("");
  const filtered = rows.filter((r) => `${r.title} ${r.body ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Notification stream</CardTitle>
          <Badge variant="outline" className="text-[10px]">{filtered.length}</Badge>
        </div>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notifications…" className="h-8 w-56" />
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[70vh] rounded-lg border">
          <div className="space-y-1 p-2">
            {isLoading && <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>}
            {filtered.map((n) => (
              <div key={n.id} className="flex items-start justify-between gap-3 rounded-lg border bg-card/60 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-medium">{n.title}</span>
                    <Badge variant={n.level === "critical" ? "destructive" : "outline"} className="text-[9px]">{n.level ?? "info"}</Badge>
                    {!n.read_at && <Badge variant="secondary" className="text-[9px]">unread</Badge>}
                  </div>
                  {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                  {n.entity_type && <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{n.entity_type} · {String(n.entity_id ?? "").slice(0, 8)}</p>}
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">{format(new Date(n.created_at), "MMM d HH:mm")}</span>
              </div>
            ))}
            {!isLoading && filtered.length === 0 && <p className="py-16 text-center text-sm text-muted-foreground">No notifications.</p>}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
