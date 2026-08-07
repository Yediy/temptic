import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ASSISTANT_TASKS } from "@/lib/comms/fabric";
import { AssistantPanel } from "@/components/comms/AssistantPanel";
import { useCommEvents, useCommNotifications, useCommThreads } from "@/hooks/comms/use-comms";

export default function CommsAssistant() {
  const { data: threads = [] } = useCommThreads();
  const { data: notifications = [] } = useCommNotifications(50);
  const { data: events = [] } = useCommEvents(60);
  const [scratch, setScratch] = useState("");

  const orgContext = useMemo(
    () =>
      [
        `Open conversations (${threads.length}): ${threads.slice(0, 20).map((t) => t.title).join(", ")}`,
        `Recent notifications: ${notifications.slice(0, 20).map((n) => `${n.level}:${n.title}`).join(" | ")}`,
        `Recent fabric events: ${events.slice(0, 25).map((e) => `${e.module}.${e.name}`).join(", ")}`,
        scratch && `Operator notes: ${scratch}`,
      ]
        .filter(Boolean)
        .join("\n"),
    [threads, notifications, events, scratch],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Assistant capabilities</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {ASSISTANT_TASKS.map((t) => (
              <div key={t.key} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{t.label}</p>
                  <Badge variant="outline" className="text-[9px] uppercase">{t.operation.replace(/_/g, " ")}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Working context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              value={scratch}
              onChange={(e) => setScratch(e.target.value)}
              placeholder="Paste a message, a policy question, or describe the situation…"
              className="min-h-[140px]"
            />
            <p className="text-xs text-muted-foreground">
              The assistant automatically sees your live conversations, notifications and fabric events.
            </p>
          </CardContent>
        </Card>
      </div>

      <AssistantPanel context={orgContext} title="Ask the cognitive core" />
    </div>
  );
}
