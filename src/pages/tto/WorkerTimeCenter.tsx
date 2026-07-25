import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useTtoTickets, useTtoPunch, useTtoSubmit } from "@/hooks/tto/use-tto";
import { toast } from "sonner";

export default function WorkerTimeCenter() {
  const { data: mine, isLoading } = useTtoTickets({ status: ["open", "in_progress", "submitted", "rejected"] });
  const punch = useTtoPunch();
  const submit = useTtoSubmit();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const doPunch = async (id: string, kind: "clock_in"|"clock_out"|"break_start"|"break_end") => {
    try { await punch.mutateAsync({ time_ticket_id: id, kind, source: "portal" }); toast.success(kind.replace("_", " ")); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };
  const doSubmit = async (id: string) => {
    try { await submit.mutateAsync({ time_ticket_id: id, notes: notes[id] }); toast.success("Submitted for approval"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <div className="space-y-3">
      <h2 className="font-semibold">My Time Tickets</h2>
      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {!isLoading && mine?.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">No open time tickets.</Card>}
      {mine?.map((t) => (
        <Card key={t.id} className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{t.work_date}</div>
              <div className="text-xs text-muted-foreground">
                {t.actual_start ? `Started ${new Date(t.actual_start).toLocaleTimeString()}` : "Not started"}
                {t.actual_end && ` · Ended ${new Date(t.actual_end).toLocaleTimeString()}`}
              </div>
            </div>
            <Badge variant="secondary">{t.status}</Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button size="sm" onClick={() => doPunch(t.id, "clock_in")} disabled={!!t.actual_start}>Clock In</Button>
            <Button size="sm" variant="outline" onClick={() => doPunch(t.id, "break_start")}>Break Start</Button>
            <Button size="sm" variant="outline" onClick={() => doPunch(t.id, "break_end")}>Break End</Button>
            <Button size="sm" variant="destructive" onClick={() => doPunch(t.id, "clock_out")} disabled={!t.actual_start || !!t.actual_end}>Clock Out</Button>
          </div>
          {t.status !== "submitted" && (
            <div className="space-y-2">
              <Textarea placeholder="Notes for supervisor…" value={notes[t.id] ?? ""} onChange={(e) => setNotes({ ...notes, [t.id]: e.target.value })} rows={2} />
              <Button size="sm" onClick={() => doSubmit(t.id)} disabled={!t.actual_end}>Submit for Approval</Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
