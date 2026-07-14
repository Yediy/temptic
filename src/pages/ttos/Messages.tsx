import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

type Thread = { id: string; subject: string | null; last_message_at: string | null; participants: string[] };
type Message = { id: string; sender_id: string; body: string; created_at: string };

export default function Messages() {
  const { user, agencyId } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<Thread | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");

  async function loadThreads() {
    if (!user) return;
    const { data } = await supabase
      .from("ttos_message_threads")
      .select("*")
      .contains("participants", [user.id])
      .order("last_message_at", { ascending: false, nullsFirst: false });
    setThreads((data ?? []) as Thread[]);
  }
  async function loadMsgs(id: string) {
    const { data } = await supabase.from("ttos_messages").select("*").eq("thread_id", id).order("created_at");
    setMsgs((data ?? []) as Message[]);
  }

  useEffect(() => { loadThreads(); /* eslint-disable-next-line */ }, [user]);
  useEffect(() => { if (active) loadMsgs(active.id); }, [active]);

  async function newThread() {
    if (!user || !agencyId) return;
    const { data, error } = await supabase
      .from("ttos_message_threads")
      .insert({ agency_id: agencyId, subject: subject || "New thread", participants: [user.id], created_by: user.id })
      .select().single();
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setSubject(""); loadThreads(); setActive(data as Thread);
  }

  async function send() {
    if (!active || !user || !body.trim()) return;
    const { error } = await supabase.from("ttos_messages").insert({
      thread_id: active.id, sender_id: user.id, body: body.trim(),
    });
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    await supabase.from("ttos_message_threads").update({ last_message_at: new Date().toISOString() }).eq("id", active.id);
    setBody(""); loadMsgs(active.id);
  }

  return (
    <div className="grid gap-4 md:grid-cols-[280px_1fr]">
      <Card>
        <CardHeader><CardTitle>Threads</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Input placeholder="New thread subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <Button size="sm" onClick={newThread}>+</Button>
          </div>
          {threads.map((t) => (
            <button key={t.id} onClick={() => setActive(t)}
              className={`block w-full rounded-md border p-2 text-left text-sm ${active?.id === t.id ? "bg-muted" : ""}`}>
              <div className="font-medium">{t.subject ?? "(no subject)"}</div>
              {t.last_message_at && (
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(t.last_message_at), { addSuffix: true })}
                </div>
              )}
            </button>
          ))}
          {threads.length === 0 && <p className="text-sm text-muted-foreground">No threads yet.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{active?.subject ?? "Select a thread"}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {active ? (
            <>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {msgs.map((m) => (
                  <div key={m.id} className={`rounded-md p-2 text-sm ${m.sender_id === user?.id ? "bg-primary/10 ml-8" : "bg-muted mr-8"}`}>
                    <div>{m.body}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Type a message…" value={body} onChange={(e) => setBody(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
                <Button onClick={send} disabled={!body.trim()}>Send</Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Pick or create a thread to start messaging.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
