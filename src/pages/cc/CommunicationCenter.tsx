import { useParams } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useCcThreads, useCcMessages, useSendMessage, useCreateThread, useSummarizeThread } from "@/hooks/cc/use-client-collab";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function CommunicationCenter() {
  const { clientId } = useParams();
  const { user } = useAuth();
  const { data: threads } = useCcThreads(clientId);
  const [threadId, setThreadId] = useState<string | undefined>();
  const activeId = threadId ?? threads?.[0]?.id;
  const { data: msgs } = useCcMessages(activeId);
  const send = useSendMessage();
  const create = useCreateThread();
  const summarize = useSummarizeThread();
  const [text, setText] = useState("");

  const { data: client } = useQuery({
    enabled: !!clientId,
    queryKey: ["cc", "client-agency", clientId],
    queryFn: async () => (await supabase.from("clients").select("id, agency_id").eq("id", clientId!).maybeSingle()).data,
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr] h-[70vh]">
      <aside className="rounded-xl border bg-card flex flex-col overflow-hidden">
        <div className="border-b px-3 py-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Threads</p>
          <Button size="sm" variant="ghost" onClick={() => {
            if (!clientId || !client?.agency_id) return;
            create.mutate({ client_id: clientId, agency_id: client.agency_id, subject: "New conversation" }, {
              onSuccess: (t) => setThreadId(t.id),
            });
          }}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y">
          {(threads ?? []).map((t) => (
            <button
              key={t.id}
              onClick={() => setThreadId(t.id)}
              className={`w-full text-left px-3 py-2 hover:bg-muted/40 ${activeId === t.id ? "bg-muted/60" : ""}`}
            >
              <p className="text-sm font-medium truncate">{t.subject ?? "Untitled"}</p>
              <p className="text-xs text-muted-foreground">
                {t.last_message_at ? formatDistanceToNow(new Date(t.last_message_at), { addSuffix: true }) : "No messages"}
              </p>
            </button>
          ))}
          {!threads?.length && <p className="p-4 text-xs text-muted-foreground">Start a new conversation.</p>}
        </div>
      </aside>

      <section className="rounded-xl border bg-card flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <h3 className="text-sm font-semibold">
            {threads?.find((t) => t.id === activeId)?.subject ?? "Select a thread"}
          </h3>
          <Button size="sm" variant="outline" disabled={!activeId || summarize.isPending} onClick={() => activeId && summarize.mutate(activeId)}>
            <Sparkles className="h-3.5 w-3.5 mr-1" /> {summarize.isPending ? "Summarizing…" : "AI Summary"}
          </Button>
        </div>
        {summarize.data?.data?.summary && (
          <div className="border-b bg-muted/30 px-4 py-2 text-xs whitespace-pre-wrap">{summarize.data.data.summary}</div>
        )}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {(msgs ?? []).map((m) => {
            const mine = m.sender_user_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {m.body}
                  <p className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
          {!msgs?.length && activeId && <p className="text-sm text-muted-foreground">No messages yet.</p>}
        </div>
        <div className="border-t p-2 flex gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            className="min-h-[44px] max-h-32"
          />
          <Button
            disabled={!activeId || !text.trim() || send.isPending}
            onClick={() => {
              if (!activeId) return;
              send.mutate({ thread_id: activeId, body: text }, { onSuccess: () => setText("") });
            }}
          >
            Send
          </Button>
        </div>
      </section>
    </div>
  );
}
