import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ListChecks, Plus, Check } from "lucide-react";
import { PRIORITY_TONE, normalizePriority } from "@/lib/comms/fabric";
import { useCommTasks, useCreateCommTask, useUpdateCommTask } from "@/hooks/comms/use-comms";
import { toast } from "@/hooks/use-toast";

export default function CommsTasks() {
  const [status, setStatus] = useState<"open" | "done" | "all">("open");
  const { data: tasks = [], isLoading } = useCommTasks(status);
  const create = useCreateCommTask();
  const update = useUpdateCommTask();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");

  const grouped = useMemo(() => {
    const order = ["critical", "high", "medium", "low"];
    return [...tasks].sort((a, b) => order.indexOf(normalizePriority(a.priority)) - order.indexOf(normalizePriority(b.priority)));
  }, [tasks]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm"><ListChecks className="h-4 w-4" /> Communication tasks</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New task from a conversation…" className="max-w-md" />
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <Button
            disabled={!title.trim() || create.isPending}
            onClick={() =>
              create.mutate({ title: title.trim(), priority }, {
                onSuccess: () => { setTitle(""); toast({ title: "Task created" }); },
                onError: (e) => toast({ title: "Failed", description: e instanceof Error ? e.message : "", variant: "destructive" }),
              })
            }
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add task
          </Button>
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="h-10 rounded-md border bg-background px-3 text-sm">
            <option value="open">Open</option>
            <option value="done">Completed</option>
            <option value="all">All</option>
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="divide-y p-0">
          {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading tasks…</p>}
          {!isLoading && !grouped.length && <p className="p-6 text-sm text-muted-foreground">No tasks in this view.</p>}
          {grouped.map((t) => {
            const p = normalizePriority(t.priority);
            return (
              <div key={t.id} className="flex items-start gap-3 px-4 py-3">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={() => update.mutate({ id: t.id, status: t.status === "done" ? "open" : "done" })}
                >
                  <Check className={cn("h-4 w-4", t.status === "done" ? "text-primary" : "text-muted-foreground")} />
                </Button>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-medium", t.status === "done" && "text-muted-foreground line-through")}>{t.title}</p>
                  {t.description && <p className="mt-0.5 line-clamp-3 text-xs text-muted-foreground">{t.description}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline" className={cn("h-4 border px-1 text-[9px] uppercase", PRIORITY_TONE[p])}>{p}</Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
