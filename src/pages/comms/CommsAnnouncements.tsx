import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Pin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useCommMessages, useCommThreads, useCommsWorkspace, useCreateCommThread, useSendCommMessage } from "@/hooks/comms/use-comms";
import { toast } from "@/hooks/use-toast";

export default function CommsAnnouncements() {
  const { data: threads = [] } = useCommThreads();
  const create = useCreateCommThread();
  const send = useSendCommMessage();
  const { state, togglePin } = useCommsWorkspace();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const announcements = useMemo(
    () => threads.filter((t) => t.scope === "organization" || /announcement|broadcast/i.test(t.title)),
    [threads],
  );
  const [selected, setSelected] = useState<string | undefined>();
  const activeId = selected ?? announcements[0]?.id;
  const { data: messages = [] } = useCommMessages(activeId);

  const post = () => {
    if (!title.trim() || !body.trim()) return;
    create.mutate(
      { subject: `Announcement — ${title.trim()}`, scope: "organization" },
      {
        onSuccess: (t) =>
          send.mutate({ thread_id: t.id, body: body.trim() }, {
            onSuccess: () => { setTitle(""); setBody(""); setSelected(t.id); toast({ title: "Announcement posted" }); },
          }),
        onError: (e) => toast({ title: "Failed", description: e instanceof Error ? e.message : "", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm"><Megaphone className="h-4 w-4" /> New announcement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="What should the organization know?" className="min-h-[120px]" />
            <Button className="w-full" onClick={post} disabled={!title.trim() || !body.trim()}>Post announcement</Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="divide-y p-0">
            {announcements.map((a) => (
              <div key={a.id} className="flex items-center gap-2 px-3 py-2">
                <button onClick={() => setSelected(a.id)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {a.last_message_at ? formatDistanceToNow(new Date(a.last_message_at), { addSuffix: true }) : "Draft"}
                  </p>
                </button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => togglePin(a.id)}>
                  <Pin className={state.pinned.includes(a.id) ? "h-3.5 w-3.5 fill-current" : "h-3.5 w-3.5"} />
                </Button>
              </div>
            ))}
            {!announcements.length && <p className="p-4 text-xs text-muted-foreground">No announcements yet.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{announcements.find((a) => a.id === activeId)?.title ?? "Select an announcement"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {messages.map((m) => (
            <article key={m.id} className="rounded-lg border bg-muted/20 p-4">
              <Badge variant="secondary" className="mb-2 text-[10px]">
                {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
              </Badge>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
            </article>
          ))}
          {!messages.length && <p className="text-sm text-muted-foreground">Nothing published in this announcement yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
