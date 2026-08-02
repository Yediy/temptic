import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Repeat } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { EventRow } from "@/components/activity/EventRow";
import { useEventReplay, useEventSearch } from "@/hooks/activity/use-event-fabric";
import type { FabricEvent } from "@/lib/activity/events";

export default function EventReplay() {
  const { roles } = useAuth();
  const authorized = roles.some((r) => ["super_admin", "agency_admin"].includes(r));

  const [filters, setFilters] = useState({ search: "", from: "", to: "" });
  const [dryRun, setDryRun] = useState(true);
  const [picked, setPicked] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: events = [] } = useEventSearch({
    search: filters.search || undefined,
    from: filters.from ? new Date(filters.from).toISOString() : undefined,
    to: filters.to ? new Date(filters.to).toISOString() : undefined,
    limit: 200,
    sort: "newest",
  });
  const { replay, running, log } = useEventReplay();

  const toggle = (e: FabricEvent) => setPicked((p) => (p.includes(e.id) ? p.filter((x) => x !== e.id) : [...p, e.id]));

  const run = async () => {
    const results = await replay(picked, { dryRun });
    const failed = results.filter((r) => !r.ok).length;
    toast[failed ? "error" : "success"](
      dryRun ? `Dry run complete for ${results.length} event(s)` : `Replayed ${results.length - failed}/${results.length} event(s)`,
    );
  };

  if (!authorized) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Restricted</AlertTitle>
        <AlertDescription>Event replay is limited to agency administrators.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="text-base">Select events to replay</CardTitle>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Event name</Label>
              <Input className="h-8" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input type="date" className="h-8" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input type="date" className="h-8" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[58vh] rounded-lg border">
            <div className="space-y-1 p-2">
              {events.map((e) => (
                <div key={e.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    aria-label={`Select ${e.name}`}
                    checked={picked.includes(e.id)}
                    onChange={() => toggle(e)}
                    className="h-4 w-4 accent-[hsl(var(--primary))]"
                  />
                  <div className="flex-1">
                    <EventRow event={e} dense onSelect={() => toggle(e)} selected={picked.includes(e.id)} />
                  </div>
                </div>
              ))}
              {events.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">No events in range.</p>}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Replay controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Dry run</p>
                <p className="text-xs text-muted-foreground">Simulate without invoking subscribers</p>
              </div>
              <Switch checked={dryRun} onCheckedChange={setDryRun} aria-label="Dry run" />
            </div>

            <div className="rounded-md border p-3 text-xs">
              <p className="font-medium">Impact preview</p>
              <p className="mt-1 text-muted-foreground">
                {picked.length} event(s) selected. {dryRun
                  ? "No subscribers will run; results are simulated."
                  : "Subscribers and automations will re-execute for each event."}
              </p>
              <p className="mt-1 text-muted-foreground">
                Rollback preview: replays are additive — original events remain immutable and no records are deleted.
              </p>
            </div>

            <Button className="w-full" disabled={picked.length === 0 || running} onClick={() => (dryRun ? void run() : setConfirmOpen(true))}>
              <Repeat className="mr-2 h-4 w-4" />
              {running ? "Running…" : dryRun ? "Run dry replay" : `Replay ${picked.length} event(s)`}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setPicked([])} disabled={picked.length === 0}>
              Clear selection
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Replay log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {log.map((l, i) => (
              <div key={`${l.id}-${i}`} className="flex items-start justify-between gap-2 rounded border px-2 py-1.5 text-[11px]">
                <span className="font-mono">{l.id.slice(0, 8)}</span>
                <span className="flex-1 text-muted-foreground">{l.message}</span>
                <Badge variant={l.ok ? "outline" : "destructive"} className="text-[9px]">{l.ok ? "ok" : "error"}</Badge>
                <span className="text-muted-foreground">{format(new Date(l.at), "HH:mm:ss")}</span>
              </div>
            ))}
            {log.length === 0 && <p className="text-xs text-muted-foreground">No replays yet this session.</p>}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replay {picked.length} live event(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Subscribers, automations, and AI agents will re-execute. This may send notifications or trigger downstream work.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void run()}>Confirm replay</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
