import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAiActivity, type AiActivityItem } from "@/hooks/activity/use-event-fabric";

const SOURCES: Array<AiActivityItem["source"]> = ["recommendation", "decision", "prediction", "reasoning", "run"];

export default function AiActivity() {
  const { data: items = [], isLoading } = useAiActivity();
  const [q, setQ] = useState("");
  const [sources, setSources] = useState<Array<AiActivityItem["source"]>>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = items.filter((i) => {
    if (sources.length && !sources.includes(i.source)) return false;
    if (!q) return true;
    return `${i.title} ${i.detail ?? ""} ${i.kind}`.toLowerCase().includes(q.toLowerCase());
  });

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">WOIC activity feed</CardTitle>
          <Badge variant="outline" className="text-[10px]">{filtered.length}</Badge>
        </div>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search AI activity…" className="h-8 w-56" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {SOURCES.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={sources.includes(s)}
              onClick={() => setSources((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] capitalize",
                sources.includes(s) ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent/40",
              )}
            >
              {s}
            </button>
          ))}
        </div>

        <ScrollArea className="h-[65vh] rounded-lg border">
          <div className="space-y-1 p-2">
            {isLoading && <p className="py-10 text-center text-sm text-muted-foreground">Loading cognitive activity…</p>}
            {filtered.map((i) => {
              const open = openId === i.id;
              return (
                <div key={`${i.source}-${i.id}`} className="rounded-lg border bg-card/60">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : i.id)}
                    className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-medium">{i.title}</span>
                        <Badge variant="outline" className="text-[9px] capitalize">{i.source}</Badge>
                        {i.status && <Badge variant="secondary" className="text-[9px]">{i.status}</Badge>}
                        {i.confidence !== null && i.confidence !== undefined && (
                          <Badge variant="outline" className="border-primary/40 bg-primary/10 text-[9px] text-primary">
                            {Math.round(Number(i.confidence) * (Number(i.confidence) <= 1 ? 100 : 1))}% confidence
                          </Badge>
                        )}
                      </div>
                      {i.detail && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{i.detail}</p>}
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {format(new Date(i.created_at), "MMM d HH:mm")}
                    </span>
                  </button>
                  {open && (
                    <div className="border-t px-3 py-2">
                      <p className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Explanation & payload</p>
                      <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 font-mono text-[11px]">
                        {JSON.stringify(i.raw, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
            {!isLoading && filtered.length === 0 && (
              <p className="py-16 text-center text-sm text-muted-foreground">No AI activity recorded yet.</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
