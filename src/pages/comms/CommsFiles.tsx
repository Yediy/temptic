import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Paperclip, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useCommThreads, useRecentMessages } from "@/hooks/comms/use-comms";

type Attachment = { name?: string; url?: string; type?: string; size?: number };

export default function CommsFiles() {
  const { data: messages = [], isLoading } = useRecentMessages();
  const { data: threads = [] } = useCommThreads();
  const [q, setQ] = useState("");

  const files = useMemo(() => {
    const threadById = new Map(threads.map((t) => [t.id, t]));
    const out: Array<Attachment & { at: string; thread: string; id: string }> = [];
    for (const m of messages) {
      const list = Array.isArray(m.attachments) ? (m.attachments as Attachment[]) : [];
      list.forEach((a, i) =>
        out.push({ ...a, id: `${m.id}-${i}`, at: m.created_at, thread: threadById.get(m.thread_id)?.title ?? "Conversation" }),
      );
    }
    const needle = q.trim().toLowerCase();
    return out.filter((f) => !needle || `${f.name ?? ""} ${f.thread}`.toLowerCase().includes(needle));
  }, [messages, threads, q]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm"><Paperclip className="h-4 w-4" /> Shared files</CardTitle>
        </CardHeader>
        <CardContent>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search shared files…" className="max-w-sm" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="divide-y p-0">
          {isLoading && <p className="p-6 text-sm text-muted-foreground">Scanning conversations…</p>}
          {!isLoading && !files.length && (
            <p className="p-6 text-sm text-muted-foreground">
              No files have been shared in conversations yet. Attachments sent in any conversation appear here automatically.
            </p>
          )}
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-3 px-4 py-3">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                {f.url ? (
                  <a href={f.url} target="_blank" rel="noreferrer" className="truncate text-sm font-medium hover:underline">
                    {f.name ?? "Attachment"}
                  </a>
                ) : (
                  <p className="truncate text-sm font-medium">{f.name ?? "Attachment"}</p>
                )}
                <p className="text-[10px] text-muted-foreground">{f.thread}</p>
              </div>
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                {formatDistanceToNow(new Date(f.at), { addSuffix: true })}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
