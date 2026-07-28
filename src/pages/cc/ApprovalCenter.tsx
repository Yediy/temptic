import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCcApprove } from "@/hooks/cc/use-client-collab";

export default function ApprovalCenter() {
  const { clientId } = useParams();
  const approve = useCcApprove();

  const { data: tickets } = useQuery({
    enabled: !!clientId,
    queryKey: ["cc", "approvals", "tickets", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tto_time_tickets").select("*").eq("client_id", clientId!).eq("status", "submitted");
      if (error) throw error;
      return data;
    },
  });
  const { data: invoices } = useQuery({
    enabled: !!clientId,
    queryKey: ["cc", "approvals", "invoices", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("pb_invoices").select("*").eq("client_id", clientId!).eq("status", "review");
      if (error) throw error;
      return data;
    },
  });

  const row = (target: string, id: string, primary: string, secondary: string) => (
    <div key={`${target}:${id}`} className="flex items-center justify-between px-4 py-3">
      <div>
        <p className="text-sm font-medium">{primary}</p>
        <p className="text-xs text-muted-foreground">{secondary}</p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => approve.mutate({ target, id, decision: "reject" })}>Reject</Button>
        <Button size="sm" onClick={() => approve.mutate({ target, id, decision: "approve" })}>Approve</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Time Tickets Awaiting Approval</h3>
          <Badge variant="outline">{tickets?.length ?? 0}</Badge>
        </div>
        <div className="divide-y">
          {tickets?.length ? tickets.map((t: any) => row("time_ticket", t.id, t.ticket_number ?? t.id.slice(0, 8), `Submitted ${new Date(t.submitted_at ?? t.created_at).toLocaleDateString()}`))
            : <p className="p-4 text-sm text-muted-foreground">Nothing pending.</p>}
        </div>
      </section>

      <section className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Invoices In Review</h3>
          <Badge variant="outline">{invoices?.length ?? 0}</Badge>
        </div>
        <div className="divide-y">
          {invoices?.length ? invoices.map((i: any) => row("invoice", i.id, `Invoice ${i.number}`, `$${Number(i.total).toFixed(2)} · ${i.period_start} to ${i.period_end}`))
            : <p className="p-4 text-sm text-muted-foreground">Nothing pending.</p>}
        </div>
      </section>
    </div>
  );
}
