import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Eye, Play, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { EventRow } from "@/components/activity/EventRow";
import { callEventReplay, useEventSearch, useReplayRuns, type ReplayMode, type ReplayRequest } from "@/hooks/activity/use-event-fabric";
import type { FabricEvent } from "@/lib/activity/events";
import type { ReplayImpact } from "@/lib/activity/replay-plan";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ADMIN = ["super_admin", "agency_owner", "agency_admin"];
const csv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

interface Preview { plan_hash: string; requires_confirmation: boolean; impact: ReplayImpact; request: ReplayRequest }

export default function EventReplay() {
  const { roles, agencyId } = useAuth();
  const qc = useQueryClient();
  const authorized = roles.some((r) => ADMIN.includes(r));

  const [mode, setMode] = useState<ReplayMode>("single");
  const [search, setSearch] = useState("");
  const [eventId, setEventId] = useState("");
  const [correlationId, setCorrelationId] = useState("");
  const [range, setRange] = useState({ from: "", to: "", names: "", modules: "", statuses: "" });
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState("");

  const { data: events = [] } = useEventSearch({ search: search || undefined, limit: 100, sort: "newest" });
  const runs = useReplayRuns();

  const request = useMemo<ReplayRequest | null>(() => {
    if (mode === "single") return UUID.test(eventId) ? { mode, event_id: eventId } : null;
    if (mode === "workflow") return UUID.test(correlationId) ? { mode, correlation_id: correlationId } : null;
    if (!range.from || !range.to) return null;
    return {
      mode,
      range: {
        from: new Date(range.from).toISOString(), to: new Date(range.to).toISOString(),
        names: csv(range.names), modules: csv(range.modules), statuses: csv(range.statuses),
      },
    };
  }, [mode, eventId, correlationId, range]);
  const stale = !!preview && JSON.stringify(preview.request) !== JSON.stringify(request);

  const pick = (e: FabricEvent) => {
    if (mode === "workflow") setCorrelationId(e.correlation_id ?? e.id);
    else { setMode("single"); setEventId(e.id); }
    setPreview(null);
  };

  const runPreview = async () => {
    if (!request || !agencyId) return;
    setBusy(true);
    try {
      const d = await callEventReplay(agencyId, { ...request, dry_run: true });
      setPreview({ plan_hash: String(d.plan_hash), requires_confirmation: Boolean(d.requires_confirmation), impact: d.impact as ReplayImpact, request });
      qc.invalidateQueries({ queryKey: ["fabric", "replay-runs"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const execute = async () => {
    if (!preview || !agencyId) return;
    setBusy(true);
    setConfirmOpen(false);
    try {
      const d = await callEventReplay(agencyId, { ...preview.request, dry_run: false, plan_hash: preview.plan_hash, confirm: preview.requires_confirmation });
      const n = (d.replayed_event_ids as string[] | undefined)?.length ?? 0;
      toast.success(`Replayed ${n} event${n === 1 ? "" : "s"}. New copies are being processed now.`);
      setPreview(null);
    } catch (e) {
      const err = e as Error & { code?: string; data?: Preview };
      if (err.code === "plan_changed" && err.data) {
        setPreview({ ...(err.data as Preview), request: preview.request });
        toast.error("Something changed since the preview. Review the updated impact and confirm again.");
      } else toast.error(err.message);
    } finally {
      setBusy(false);
      setTyped("");
      qc.invalidateQueries({ queryKey: ["fabric", "replay-runs"] });
    }
  };

  if (!authorized) {
    return (
      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Restricted</AlertTitle>
        <AlertDescription>Event replay is limited to agency owners and administrators.</AlertDescription>
      </Alert>
    );
  }

  const imp = preview?.impact;
  const confirmWord = `REPLAY ${imp?.events ?? 0}`;

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
      <div className="space-y-4">
        <Card>
          <CardHeader className="space-y-3">
            <CardTitle className="text-base">What to replay</CardTitle>
            <Tabs value={mode} onValueChange={(v) => { setMode(v as ReplayMode); setPreview(null); }}>
              <TabsList>
                <TabsTrigger value="single">Single event</TabsTrigger>
                <TabsTrigger value="range">Time range</TabsTrigger>
                <TabsTrigger value="workflow">Whole workflow</TabsTrigger>
              </TabsList>
            </Tabs>
            {mode === "single" && (
              <div className="space-y-1">
                <Label className="text-xs">Event ID</Label>
                <Input className="h-8 font-mono text-xs" value={eventId} onChange={(e) => { setEventId(e.target.value.trim()); }} placeholder="Paste an ID or pick an event below" />
              </div>
            )}
            {mode === "workflow" && (
              <div className="space-y-1">
                <Label className="text-xs">Correlation ID (or the first event's ID)</Label>
                <Input className="h-8 font-mono text-xs" value={correlationId} onChange={(e) => setCorrelationId(e.target.value.trim())} placeholder="Pick any event in the workflow below" />
                <p className="text-[11px] text-muted-foreground">Only the starting event(s) are replayed; follow-on events are recreated by your automations.</p>
              </div>
            )}
            {mode === "range" && (
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1"><Label className="text-xs">From</Label><Input type="datetime-local" className="h-8" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></div>
                <div className="space-y-1"><Label className="text-xs">To</Label><Input type="datetime-local" className="h-8" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></div>
                <div className="space-y-1"><Label className="text-xs">Event names (optional, comma-separated)</Label><Input className="h-8 text-xs" value={range.names} onChange={(e) => setRange({ ...range, names: e.target.value })} placeholder="client.created, shift.cancelled" /></div>
                <div className="space-y-1"><Label className="text-xs">Modules (optional)</Label><Input className="h-8 text-xs" value={range.modules} onChange={(e) => setRange({ ...range, modules: e.target.value })} /></div>
                <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Statuses (optional)</Label><Input className="h-8 text-xs" value={range.statuses} onChange={(e) => setRange({ ...range, statuses: e.target.value })} placeholder="failed" /></div>
                <p className="text-[11px] text-muted-foreground sm:col-span-2">Up to 200 events per replay. Earlier replays are left out so effects don't compound.</p>
              </div>
            )}
            <Button onClick={() => void runPreview()} disabled={!request || busy} className="w-fit">
              <Eye className="mr-2 h-4 w-4" /> {busy && !preview ? "Previewing…" : "Preview impact (dry run)"}
            </Button>
          </CardHeader>
        </Card>

        {mode !== "range" && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">{mode === "workflow" ? "Pick an event from the workflow" : "Pick an event"}</CardTitle>
                <Input className="h-8 w-56" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search event names…" />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[40vh] rounded-lg border">
                <div className="space-y-1 p-2">
                  {events.map((e) => {
                    const on = mode === "single" ? eventId === e.id : correlationId === (e.correlation_id ?? e.id);
                    return (
                      <div key={e.id} className={cn("rounded-lg", on && "ring-2 ring-primary")}>
                        <EventRow event={e} onSelect={pick} selected={on} />
                      </div>
                    );
                  })}
                  {events.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No events found.</p>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Impact preview</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!imp && <p className="text-xs text-muted-foreground">Run a dry run to see exactly what replaying would do. Nothing changes until you confirm.</p>}
            {imp && (
              <>
                {stale && (
                  <Alert><AlertTriangle className="h-4 w-4" /><AlertDescription>The selection changed. Preview again before replaying.</AlertDescription></Alert>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="Events replayed" value={imp.events} />
                  <Stat label="Rules triggered" value={imp.rules_triggered} />
                  <Stat label="Notifications" value={imp.actions.notify} />
                  <Stat label="Tasks created" value={imp.actions.create_task} />
                  <Stat label="Events published" value={imp.actions.emit_event} />
                  <Stat label="Approvals requested" value={imp.actions.awaiting_approval} warn={imp.actions.awaiting_approval > 0} />
                </div>
                {imp.sensitive.length > 0 && (
                  <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Sensitive actions</AlertTitle>
                    <AlertDescription>
                      {imp.sensitive.map((s) => s.replace(/_/g, " ")).join(", ")} will be sent for approval again. They won't run until someone with the right role approves.
                    </AlertDescription>
                  </Alert>
                )}
                {!imp.destructive && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5" /> No automations would act on these events. Replaying only refreshes search and history.</p>
                )}
                <ScrollArea className="h-56 rounded border">
                  <div className="space-y-2 p-2 text-xs">
                    {imp.per_event.map((pe) => (
                      <div key={pe.event_id} className="rounded border p-2">
                        <p className="font-mono">{pe.name} <span className="text-muted-foreground">· {format(new Date(pe.created_at), "PP p")}</span></p>
                        {pe.rules.length === 0 && <p className="text-muted-foreground">No rules match</p>}
                        {pe.rules.map((r) => (
                          <div key={r.id} className="mt-1">
                            <p className="font-medium">{r.name}</p>
                            <ul className="ml-4 list-disc text-muted-foreground">
                              {r.actions.map((a) => (
                                <li key={a.index}>
                                  {a.summary}
                                  {a.outcome === "await_approval" && <Badge variant="outline" className="ml-1 h-4 px-1 text-[9px]">needs approval</Badge>}
                                  {a.outcome === "unsupported" && <Badge variant="outline" className="ml-1 h-4 px-1 text-[9px]">skipped</Badge>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <p className="text-[11px] text-muted-foreground">
                  Originals are never changed. Each event is copied as a new event marked as a replay, then runs through your current rules.
                </p>
                <Button
                  className="w-full"
                  variant={imp.destructive ? "destructive" : "default"}
                  disabled={busy || stale}
                  onClick={() => (preview!.requires_confirmation ? setConfirmOpen(true) : void execute())}
                >
                  <Play className="mr-2 h-4 w-4" /> {busy ? "Replaying…" : `Replay ${imp.events} event${imp.events === 1 ? "" : "s"}`}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Replay history</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-1 text-xs">
                {(runs.data ?? []).map((r) => (
                  <div key={String(r.id)} className="flex items-center justify-between gap-2 border-b py-1">
                    <span>
                      <Badge variant={r.status === "completed" ? "default" : r.status === "failed" || r.status === "denied" ? "destructive" : "outline"} className="mr-1 h-4 px-1 text-[9px]">
                        {String(r.status)}
                      </Badge>
                      {String(r.mode)} · {(r.event_ids as string[] | null)?.length ?? 0} events
                      {(r.replayed_event_ids as string[] | null)?.length ? ` → ${(r.replayed_event_ids as string[]).length} replayed` : ""}
                    </span>
                    <span className="text-muted-foreground">{format(new Date(String(r.created_at)), "MMM d HH:mm")}</span>
                  </div>
                ))}
                {!runs.isLoading && !(runs.data ?? []).length && <p className="text-muted-foreground">No replays yet.</p>}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={(o) => { setConfirmOpen(o); if (!o) setTyped(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm replay</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>This will create real records:</p>
                <ul className="ml-5 list-disc">
                  {imp && imp.actions.notify > 0 && <li>{imp.actions.notify} notification(s) sent to people</li>}
                  {imp && imp.actions.create_task > 0 && <li>{imp.actions.create_task} task(s) created</li>}
                  {imp && imp.actions.emit_event > 0 && <li>{imp.actions.emit_event} new event(s), which can trigger more rules</li>}
                  {imp && imp.actions.awaiting_approval > 0 && <li>{imp.actions.awaiting_approval} approval request(s)</li>}
                </ul>
                <p>It can't be undone. Type <code className="rounded bg-muted px-1 font-mono">{confirmWord}</code> to continue.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} className="font-mono" aria-label="Type confirmation" autoFocus />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={typed.trim() !== confirmWord}
              onClick={(e) => { if (typed.trim() !== confirmWord) { e.preventDefault(); return; } void execute(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Replay now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={cn("rounded-lg border p-2", warn && "border-destructive/40")}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
