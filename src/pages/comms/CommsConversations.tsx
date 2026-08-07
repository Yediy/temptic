import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Plus, Send, Star, StarOff } from "lucide-react";
import { CONVERSATION_SCOPES, SCOPE_LABEL, type ConversationScope } from "@/lib/comms/fabric";
import {
  useCommMessages, useCommThreads, useCreateCommThread, useCommsWorkspace,
  useMarkThreadRead, useSendCommMessage,
} from "@/hooks/comms/use-comms";
import { AssistantPanel } from "@/components/comms/AssistantPanel";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

export default function CommsConversations() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const { data: threads = [], isLoading } = useCommThreads();
  const { state, toggleFavorite } = useCommsWorkspace();
  const create = useCreateCommThread();
  const send = useSendCommMessage();
  const markRead = useMarkThreadRead();

  const [scopeFilter, setScopeFilter] = useState<ConversationScope | "all">("all");
  const [newSubject, setNewSubject] = useState("");
  const [newScope, setNewScope] = useState<ConversationScope>("group");
  const [body, setBody] = useState("");

  const activeId = params.get("thread") ?? threads[0]?.id;
  const active = threads.find((t) => t.id === activeId);
  const { data: messages = [] } = useCommMessages(activeId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (messages.length) markRead.mutate(messages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, messages.length]);

  const visible = useMemo(
    () =>
      threads
        .filter((t) => scopeFilter === "all" || t.scope === scopeFilter)
        .sort((a, b) => Number(state.favorites.includes(b.id)) - Number(state.favorites.includes(a.id))),
    [threads, scopeFilter, state.favorites],
  );

  const context = useMemo(
    () =>
      `Conversation "${active?.title ?? ""}" (${active?.scope ?? ""}):\n` +
      messages.map((m) => `${m.sender_id === user?.id ? "Me" : "Them"}: ${m.body}`).join("\n"),
    [active, messages, user?.id],
  );

  const submit = () => {
    if (!activeId || !body.trim()) return;
    send.mutate({ thread_id: activeId, body }, {
      onSuccess: () => setBody(""),
      onError: (e) => toast({ title: "Message not sent", description: e instanceof Error ? e.message : "", variant: "destructive" }),
    });
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[300px_1fr_340px]">
      <aside className="flex max-h-[72vh] flex-col overflow-hidden rounded-xl border bg-card">
        <div className="space-y-2 border-b p-3">
          <div className="flex gap-2">
            <Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="New conversation" className="h-8" />
            <Button
              size="icon"
              className="h-8 w-8 shrink-0"
              disabled={!newSubject.trim() || create.isPending}
              onClick={() =>
                create.mutate({ subject: newSubject.trim(), scope: newScope }, {
                  onSuccess: (t) => { setNewSubject(""); setParams({ thread: t.id }); },
                  onError: (e) => toast({ title: "Could not create", description: e instanceof Error ? e.message : "", variant: "destructive" }),
                })
              }
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <select
            value={newScope}
            onChange={(e) => setNewScope(e.target.value as ConversationScope)}
            className="h-8 w-full rounded-md border bg-background px-2 text-xs"
          >
            {CONVERSATION_SCOPES.map((s) => (
              <option key={s.key} value={s.key}>{s.label} — {s.hint}</option>
            ))}
          </select>
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value as ConversationScope | "all")}
            className="h-8 w-full rounded-md border bg-background px-2 text-xs"
          >
            <option value="all">All conversation types</option>
            {CONVERSATION_SCOPES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 divide-y overflow-y-auto">
          {isLoading && <p className="p-4 text-xs text-muted-foreground">Loading conversations…</p>}
          {visible.map((t) => (
            <button
              key={t.id}
              onClick={() => setParams({ thread: t.id })}
              className={cn("flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-muted/40", activeId === t.id && "bg-muted/60")}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.title}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {SCOPE_LABEL[t.scope]} · {t.participants.length} participant{t.participants.length === 1 ? "" : "s"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {t.last_message_at ? formatDistanceToNow(new Date(t.last_message_at), { addSuffix: true }) : "No messages"}
                </p>
              </div>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); toggleFavorite(t.id); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); toggleFavorite(t.id); } }}
                className="mt-0.5 text-muted-foreground"
              >
                {state.favorites.includes(t.id) ? <Star className="h-3.5 w-3.5 fill-current" /> : <StarOff className="h-3.5 w-3.5" />}
              </span>
            </button>
          ))}
          {!isLoading && !visible.length && <p className="p-4 text-xs text-muted-foreground">No conversations yet.</p>}
        </div>
      </aside>

      <Card className="flex max-h-[72vh] flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <div>
            <h2 className="text-sm font-semibold">{active?.title ?? "Select a conversation"}</h2>
            {active && <Badge variant="secondary" className="mt-1 text-[10px]">{SCOPE_LABEL[active.scope]}</Badge>}
          </div>
        </div>
        <CardContent className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[75%] rounded-lg px-3 py-2 text-sm", mine ? "bg-primary text-primary-foreground" : "bg-muted")}>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className={cn("mt-1 text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                    {(m.read_by ?? []).length > 1 && " · read"}
                  </p>
                </div>
              </div>
            );
          })}
          {!messages.length && active && <p className="text-sm text-muted-foreground">No messages yet — say hello.</p>}
          <div ref={bottomRef} />
        </CardContent>
        <div className="flex gap-2 border-t p-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder="Write a message… (Enter to send)"
            className="max-h-32 min-h-[44px]"
          />
          <Button disabled={!activeId || !body.trim() || send.isPending} onClick={submit}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      <AssistantPanel context={context} title="Conversation intelligence" />
    </div>
  );
}
