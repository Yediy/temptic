import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldCheck } from "lucide-react";
import { useAuditHistory } from "@/hooks/activity/use-event-fabric";

export default function AuditHistory() {
  const [q, setQ] = useState("");
  const { data: rows = [], isLoading } = useAuditHistory(q);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Immutable audit history</CardTitle>
          <Badge variant="outline" className="text-[10px]">{rows.length}</Badge>
        </div>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by action…" className="h-8 w-56" />
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Append-only ledger — updates and deletes are blocked at the database level. Retention: statutory 7 years.
        </p>
        <ScrollArea className="h-[68vh] rounded-lg border">
          <div className="space-y-1 p-2">
            {isLoading && <p className="py-10 text-center text-sm text-muted-foreground">Loading audit ledger…</p>}
            {rows.map((r) => {
              const open = openId === r.id;
              return (
                <div key={r.id} className="rounded-lg border bg-card/60">
                  <button type="button" onClick={() => setOpenId(open ? null : r.id)} className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{r.action}</code>
                        <Badge variant="outline" className="text-[9px]">{r.actor_type}</Badge>
                      </div>
                      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                        who {String(r.actor_id ?? "system").slice(0, 8)} · ticket {String(r.ticket_id ?? "—").slice(0, 8)} · sig {String(r.id).slice(0, 12)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{format(new Date(r.created_at), "MMM d yyyy HH:mm:ss")}</span>
                  </button>
                  {open && (
                    <div className="grid gap-2 border-t p-3 sm:grid-cols-2">
                      <div>
                        <p className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Previous value</p>
                        <pre className="max-h-56 overflow-auto rounded-md bg-muted p-3 font-mono text-[11px]">{JSON.stringify(r.old_values ?? {}, null, 2)}</pre>
                      </div>
                      <div>
                        <p className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">New value</p>
                        <pre className="max-h-56 overflow-auto rounded-md bg-muted p-3 font-mono text-[11px]">{JSON.stringify(r.new_values ?? {}, null, 2)}</pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {!isLoading && rows.length === 0 && <p className="py-16 text-center text-sm text-muted-foreground">No audit records.</p>}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
