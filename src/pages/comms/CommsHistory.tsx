import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { History } from "lucide-react";
import { CHANNELS, channelForModule, CHANNEL_LABEL, type CommChannel } from "@/lib/comms/fabric";
import { useCommEvents } from "@/hooks/comms/use-comms";
import { AssistantPanel } from "@/components/comms/AssistantPanel";

export default function CommsHistory() {
  const { data: events = [], isLoading } = useCommEvents(300);
  const [q, setQ] = useState("");
  const [channel, setChannel] = useState<CommChannel | "all">("all");

  const rows = useMemo(
    () =>
      events.filter((e) => {
        if (channel !== "all" && channelForModule(e.module, "workflow") !== channel) return false;
        if (q && !`${e.module} ${e.name} ${e.entity_type ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      }),
    [events, q, channel],
  );

  const context = rows.slice(0, 60).map((e) => `${e.created_at} ${e.module}.${e.name}`).join("\n");

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="space-y-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm"><History className="h-4 w-4" /> Communication history</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter history…" className="max-w-sm" />
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as CommChannel | "all")}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="all">All channels</option>
              {CHANNELS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <Button variant="ghost" onClick={() => { setQ(""); setChannel("all"); }}>Reset</Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading history…</p>}
            <ol className="relative border-l border-border/60 pl-4 pt-2">
              {rows.map((e) => (
                <li key={e.id} className="relative pb-4">
                  <span className={cn("absolute -left-[21px] top-1.5 h-2 w-2 rounded-full", /fail|error/i.test(e.name) ? "bg-destructive" : "bg-primary")} />
                  <p className="text-sm font-medium">{e.name.replace(/[._]/g, " ")}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {format(new Date(e.created_at), "PP p")} · {CHANNEL_LABEL[channelForModule(e.module, "workflow")]}
                    {e.entity_type && <> · {e.entity_type}</>}
                  </p>
                </li>
              ))}
            </ol>
            {!isLoading && !rows.length && <p className="p-6 text-sm text-muted-foreground">No history for this filter.</p>}
            <div className="border-t px-4 py-2">
              <Badge variant="secondary" className="text-[10px]">{rows.length} entries</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <AssistantPanel context={`Communication history:\n${context}`} title="History intelligence" compact />
    </div>
  );
}
