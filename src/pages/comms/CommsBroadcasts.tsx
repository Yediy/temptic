import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Radio, Send, Sparkles, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { CHANNELS, ASSISTANT_TASKS, type CommChannel } from "@/lib/comms/fabric";
import { useCommAssistant, useCommEvents, useCommsWorkspace, useCreateCommThread, useSendCommMessage } from "@/hooks/comms/use-comms";
import { toast } from "@/hooks/use-toast";

export default function CommsBroadcasts() {
  const create = useCreateCommThread();
  const send = useSendCommMessage();
  const assistant = useCommAssistant();
  const { state } = useCommsWorkspace();
  const { data: events = [] } = useCommEvents(150);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState<CommChannel>("internal");
  const [templateId, setTemplateId] = useState("");

  const sent = useMemo(
    () => events.filter((e) => /broadcast|notify|message|announce/i.test(e.name)).slice(0, 25),
    [events],
  );

  const draft = () => {
    assistant.mutate(
      {
        task: ASSISTANT_TASKS.find((t) => t.key === "draft")!,
        context: `Write a ${channel} broadcast. Subject: ${subject || "(none)"} . Draft notes: ${body}`,
      },
      { onSuccess: (r) => setBody(r.text) },
    );
  };

  const publish = () => {
    if (!subject.trim() || !body.trim()) return;
    create.mutate(
      { subject: `Broadcast — ${subject.trim()}`, scope: "organization" },
      {
        onSuccess: (t) =>
          send.mutate(
            { thread_id: t.id, body: body.trim() },
            {
              onSuccess: () => {
                toast({ title: "Broadcast published", description: "Delivered to the organization channel." });
                setSubject("");
                setBody("");
              },
            },
          ),
        onError: (e) => toast({ title: "Broadcast failed", description: e instanceof Error ? e.message : "", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm"><Radio className="h-4 w-4" /> Compose broadcast</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Broadcast subject" />
          <div className="flex flex-wrap gap-2">
            <select value={channel} onChange={(e) => setChannel(e.target.value as CommChannel)} className="h-9 rounded-md border bg-background px-2 text-sm">
              {CHANNELS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <select
              value={templateId}
              onChange={(e) => {
                setTemplateId(e.target.value);
                const tpl = state.templates.find((t) => t.id === e.target.value);
                if (tpl) { setBody(tpl.body); setChannel(tpl.channel); }
              }}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">Start from template…</option>
              {state.templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <Button variant="outline" size="sm" onClick={draft} disabled={assistant.isPending}>
              {assistant.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
              AI draft
            </Button>
          </div>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Broadcast message…" className="min-h-[200px]" />
          <Button onClick={publish} disabled={!subject.trim() || !body.trim() || create.isPending || send.isPending}>
            <Send className="mr-1.5 h-4 w-4" /> Publish broadcast
          </Button>
          <p className="text-xs text-muted-foreground">
            Broadcasts publish into an organization-scoped conversation so every recipient keeps a durable, auditable copy.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Recent delivery activity</CardTitle></CardHeader>
        <CardContent className="divide-y p-0">
          {sent.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm">{e.name.replace(/[._]/g, " ")}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{e.module}</p>
              </div>
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
              </Badge>
            </div>
          ))}
          {!sent.length && <p className="p-6 text-sm text-muted-foreground">No delivery activity recorded yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
