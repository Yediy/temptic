import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

type View = {
  state: "active" | "used" | "expired" | "revoked";
  decision: string | null;
  ticket: {
    work_date: string; actual_start: string | null; actual_end: string | null;
    regular_hours: number; overtime_hours: number; double_time_hours: number; break_minutes: number | null;
    worker_notes: string | null; status: string; worker_name: string | null; site_name: string | null;
  };
};

async function call(token: string, action: string, comment?: string) {
  const { data, error } = await supabase.functions.invoke("tto-approval-link", { body: { token, action, comment } });
  if (error) {
    let msg = error.message;
    try { msg = (await (error as { context: Response }).context.json()).error ?? msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return data;
}

const t = (s: string | null) => (s ? new Date(s).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—");

export default function ApproveTicketLink() {
  const { token = "" } = useParams();
  const [view, setView] = useState<View | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"approved" | "rejected" | null>(null);

  useEffect(() => { call(token, "view").then(setView).catch((e) => setErr(e.message)); }, [token]);

  const decide = async (action: "approve" | "reject") => {
    setBusy(true); setErr(null);
    try { const r = await call(token, action, action === "reject" ? reason : undefined); setDone(r.status); }
    catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong"); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background p-4 flex items-start justify-center">
      <Card className="w-full max-w-md p-6 space-y-5 mt-6">
        <div className="text-sm font-semibold text-muted-foreground">Temp Tic · Time approval</div>
        {!view && !err && <p className="text-sm text-muted-foreground">Loading…</p>}
        {err && !view && <p className="text-sm text-destructive">{err}</p>}
        {done ? (
          <div className="text-center space-y-2 py-6">
            {done === "approved" ? <CheckCircle2 className="h-12 w-12 mx-auto text-primary" /> : <XCircle className="h-12 w-12 mx-auto text-destructive" />}
            <p className="font-semibold">Ticket {done}</p>
            <p className="text-sm text-muted-foreground">Thanks — you can close this page.</p>
          </div>
        ) : view && (
          <>
            <div>
              <h1 className="text-xl font-bold">{view.ticket.worker_name ?? "Worker"}</h1>
              <p className="text-sm text-muted-foreground">{view.ticket.work_date}{view.ticket.site_name && ` · ${view.ticket.site_name}`}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><div className="text-muted-foreground text-xs">Start</div>{t(view.ticket.actual_start)}</div>
              <div><div className="text-muted-foreground text-xs">End</div>{t(view.ticket.actual_end)}</div>
              <div><div className="text-muted-foreground text-xs">Regular</div>{view.ticket.regular_hours}h</div>
              <div><div className="text-muted-foreground text-xs">Overtime</div>{view.ticket.overtime_hours}h</div>
              {Number(view.ticket.double_time_hours) > 0 && <div><div className="text-muted-foreground text-xs">Double time</div>{view.ticket.double_time_hours}h</div>}
              {view.ticket.break_minutes != null && <div><div className="text-muted-foreground text-xs">Break</div>{view.ticket.break_minutes} min</div>}
            </div>
            {view.ticket.worker_notes && <p className="text-sm rounded-md bg-muted p-3">{view.ticket.worker_notes}</p>}

            {view.state !== "active" ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-md border p-3">
                <Clock className="h-4 w-4" />
                {view.state === "used" ? `Already ${view.decision === "approve" ? "approved" : "rejected"}.` : view.state === "expired" ? "This link has expired. Ask the agency for a new one." : "A newer link was sent. Please use the latest one."}
              </div>
            ) : rejecting ? (
              <div className="space-y-2">
                <Textarea placeholder="Reason for rejecting (required)" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => setRejecting(false)} disabled={busy}>Back</Button>
                  <Button variant="destructive" onClick={() => decide("reject")} disabled={busy || !reason.trim()}>Confirm reject</Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-14" onClick={() => setRejecting(true)} disabled={busy}>Reject</Button>
                <Button className="h-14" onClick={() => decide("approve")} disabled={busy}>Approve</Button>
              </div>
            )}
            {err && <p className="text-sm text-destructive">{err}</p>}
          </>
        )}
      </Card>
    </div>
  );
}
