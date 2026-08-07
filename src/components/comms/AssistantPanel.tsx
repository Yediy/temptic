import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2 } from "lucide-react";
import { ASSISTANT_TASKS, type AssistantTask } from "@/lib/comms/fabric";
import { useCommAssistant } from "@/hooks/comms/use-comms";

type Props = {
  context: string;
  title?: string;
  tasks?: AssistantTask[];
  compact?: boolean;
};

export function AssistantPanel({ context, title = "WOIC Assistant", tasks = ASSISTANT_TASKS, compact }: Props) {
  const assistant = useCommAssistant();
  const [extra, setExtra] = useState("");
  const [log, setLog] = useState<Array<{ label: string; text: string }>>([]);

  const run = (task: AssistantTask) => {
    assistant.mutate(
      { task, context: `${context}\n\n${extra}`.trim() },
      {
        onSuccess: (r) => setLog((l) => [{ label: r.task.label, text: r.text }, ...l].slice(0, 8)),
        onError: (e) =>
          setLog((l) => [{ label: task.label, text: e instanceof Error ? e.message : "Assistant unavailable" }, ...l]),
      },
    );
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden">
        <div className="flex flex-wrap gap-1.5">
          {(compact ? tasks.slice(0, 6) : tasks).map((t) => (
            <Button
              key={t.key}
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={assistant.isPending}
              onClick={() => run(t)}
              title={t.description}
            >
              {t.label}
            </Button>
          ))}
        </div>

        <Textarea
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder="Add instructions for the assistant (optional)…"
          className="min-h-[60px] text-sm"
        />

        {assistant.isPending && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
          </p>
        )}

        <div className="flex-1 space-y-3 overflow-y-auto">
          {log.map((entry, i) => (
            <div key={i} className="rounded-lg border bg-muted/30 p-3">
              <Badge variant="secondary" className="mb-2 text-[10px]">{entry.label}</Badge>
              <p className="whitespace-pre-wrap text-xs leading-relaxed">{entry.text}</p>
            </div>
          ))}
          {!log.length && !assistant.isPending && (
            <p className="text-xs text-muted-foreground">
              Choose an action above — the assistant reads the current context and answers with the cognitive core.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
