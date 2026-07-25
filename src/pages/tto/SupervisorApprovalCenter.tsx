import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useTtoTickets, useTtoDecision, useTtoValidate } from "@/hooks/tto/use-tto";
import { toast } from "sonner";

export default function SupervisorApprovalCenter() {
  const { data: queue, isLoading } = useTtoTickets({ status: "submitted" });
  const decide = useTtoDecision();
  const validate = useTtoValidate();
  const [comments, setComments] = useState<Record<string, string>>({});

  const runValidate = async () => {
    try { const r = await validate.mutateAsync({}); toast.success(`Validated ${r.scanned} tickets`); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };
  const act = async (id: string, decision: "approve"|"reject"|"correction") => {
    try { await decide.mutateAsync({ time_ticket_id: id, decision, comment: comments[id], approver_kind: "agency" }); toast.success(decision); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Approval Queue ({queue?.length ?? 0})</h2>
        <Button size="sm" variant="outline" onClick={runValidate}>Run AI Validation</Button>
      </div>
      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {!isLoading && queue?.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">Nothing awaiting approval.</Card>}
      {queue?.map((t) => (
        <Card key={t.id} className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-medium">{t.work_date}</div>
              <div className="text-xs text-muted-foreground">
                Reg {t.regular_hours}h · OT {t.overtime_hours}h · DT {t.double_time_hours}h
              </div>
              {t.anomalies?.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {t.anomalies.map((a) => <Badge key={a} variant="destructive" className="text-[10px]">{a}</Badge>)}
                </div>
              )}
            </div>
            <Badge>{t.status}</Badge>
          </div>
          <Textarea placeholder="Comment (optional)" rows={2} value={comments[t.id] ?? ""} onChange={(e) => setComments({ ...comments, [t.id]: e.target.value })} />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => act(t.id, "approve")}>Approve</Button>
            <Button size="sm" variant="outline" onClick={() => act(t.id, "correction")}>Request Correction</Button>
            <Button size="sm" variant="destructive" onClick={() => act(t.id, "reject")}>Reject</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
