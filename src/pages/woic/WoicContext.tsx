import { useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  CONTEXT_POLL_INTERVALS,
  SUMMARY_POLL_INTERVALS,
  useContextMonitor,
  type FieldChange,
} from "@/hooks/woic/use-context-monitor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";
import { RefreshCw, Trash2 } from "lucide-react";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fmtValue(v: unknown) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function changeVariant(kind: FieldChange["kind"]) {
  return kind === "added" ? "default" : kind === "removed" ? "destructive" : "secondary";
}

export default function WoicContext() {
  const { agencyId } = useAuth();
  const [intervalMs, setIntervalMs] = useState<number>(10_000);
  const [convoInput, setConvoInput] = useState("");
  const [summaryIntervalMs, setSummaryIntervalMs] = useState<number>(0);
  const [highlight, setHighlight] = useState(true);

  const conversationId = UUID_RE.test(convoInput.trim()) ? convoInput.trim() : undefined;

  const monitor = useContextMonitor({
    agencyId: agencyId ?? undefined,
    intervalMs,
    conversationId,
    summaryIntervalMs: conversationId ? summaryIntervalMs : 0,
  });

  const { context, summary, snapshots, summaryHistory, latest, changedFields } = monitor;
  const live = intervalMs > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CardTitle>Live Context Monitor</CardTitle>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  className={`h-2 w-2 rounded-full ${live ? "bg-primary animate-pulse" : "bg-muted-foreground/50"}`}
                />
                {live ? "streaming" : "paused"}
                {context.isFetching && " · refreshing"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={String(intervalMs)} onValueChange={(v) => setIntervalMs(Number(v))}>
                <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTEXT_POLL_INTERVALS.map((i) => (
                    <SelectItem key={i.value} value={String(i.value)}>{i.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Switch id="hl" checked={highlight} onCheckedChange={setHighlight} />
                <Label htmlFor="hl" className="text-xs">Highlight changes</Label>
              </div>
              <Button variant="outline" size="sm" onClick={monitor.refreshNow} disabled={context.isFetching}>
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${context.isFetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button variant="ghost" size="sm" onClick={monitor.clear} disabled={snapshots.length === 0}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {context.isLoading && <LoadingState />}
          {context.error && <ErrorState error={context.error} />}
          {!context.isLoading && !context.error && !latest?.value && (
            <EmptyState label="No active context session for this user." />
          )}
          {latest?.value && (
            <div className="rounded-md border divide-y">
              {Object.entries(latest.value).map(([k, v]) => {
                const isChanged = highlight && changedFields.has(k);
                return (
                  <div
                    key={k}
                    className={`grid grid-cols-3 gap-2 px-3 py-2 text-sm transition-colors ${
                      isChanged ? "bg-primary/10" : ""
                    }`}
                  >
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{k}</div>
                    <div className="col-span-2 break-words font-mono text-xs flex items-center gap-2">
                      {fmtValue(v)}
                      {isChanged && <Badge variant="default" className="text-[10px]">updated</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {latest && (
            <p className="text-xs text-muted-foreground">
              Last snapshot {new Date(latest.at).toLocaleTimeString()} · {snapshots.length} recorded
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Change Stream</CardTitle></CardHeader>
        <CardContent>
          {snapshots.length <= 1 ? (
            <EmptyState label="No changes detected yet. Keep the stream running." />
          ) : (
            <ScrollArea className="h-72 pr-3">
              <div className="space-y-3">
                {snapshots.filter((s) => s.changes.length > 0).map((s) => (
                  <div key={s.id} className="rounded-md border p-3 space-y-2">
                    <div className="text-xs text-muted-foreground">
                      {new Date(s.at).toLocaleString()} · {s.changes.length} field(s)
                    </div>
                    {s.changes.map((c) => (
                      <div key={c.field} className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant={changeVariant(c.kind)} className="text-[10px]">{c.kind}</Badge>
                        <span className="font-medium">{c.field}</span>
                        <span className="font-mono text-muted-foreground line-through">{fmtValue(c.before)}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-mono">{fmtValue(c.after)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Conversation Summary Stream</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                className="h-8 w-72"
                placeholder="Conversation UUID"
                value={convoInput}
                onChange={(e) => setConvoInput(e.target.value.trim())}
              />
              <Select
                value={String(summaryIntervalMs)}
                onValueChange={(v) => setSummaryIntervalMs(Number(v))}
                disabled={!conversationId}
              >
                <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUMMARY_POLL_INTERVALS.map((i) => (
                    <SelectItem key={i.value} value={String(i.value)}>{i.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                disabled={!conversationId || summary.isFetching}
                onClick={() => summary.refetch()}
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${summary.isFetching ? "animate-spin" : ""}`} />
                Summarize now
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {convoInput && !conversationId && (
            <p className="text-xs text-destructive">Enter a valid conversation UUID.</p>
          )}
          {summary.error && <ErrorState error={summary.error} />}
          {conversationId && summaryHistory.length === 0 && !summary.isFetching && (
            <EmptyState label="No summary captured yet." />
          )}
          {summaryHistory.map((s, idx) => (
            <div
              key={s.id}
              className={`rounded-md border p-3 text-sm space-y-1 ${
                highlight && s.changed ? "border-primary bg-primary/5" : ""
              }`}
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {new Date(s.at).toLocaleString()}
                {idx === 0 && <Badge variant="outline" className="text-[10px]">latest</Badge>}
                {s.changed && <Badge className="text-[10px]">changed</Badge>}
              </div>
              <div className="whitespace-pre-wrap">{s.summary ?? "—"}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
