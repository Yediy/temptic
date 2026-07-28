import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function CcCalendar() {
  const { clientId } = useParams();
  const { data } = useQuery({
    enabled: !!clientId,
    queryKey: ["cc", "calendar", clientId],
    queryFn: async () => {
      const [assignments, invoices, tickets] = await Promise.all([
        supabase.from("placements").select("id, starts_on, ends_on, worker:workers(first_name, last_name), job:job_orders!inner(title, client_id)").eq("job.client_id", clientId!),
        supabase.from("pb_invoices").select("id, number, due_at").eq("client_id", clientId!).not("due_at", "is", null),
        supabase.from("tto_time_tickets").select("id, ticket_number, work_date").eq("client_id", clientId!),
      ]);
      return { assignments: assignments.data ?? [], invoices: invoices.data ?? [], tickets: tickets.data ?? [] };
    },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Calendar</h2>
      {(["assignments", "invoices", "tickets"] as const).map((k) => (
        <section key={k} className="rounded-xl border bg-card">
          <div className="border-b px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{k}</p>
          </div>
          <div className="divide-y">
            {(data?.[k] ?? []).slice(0, 20).map((row: any) => (
              <div key={row.id} className="px-4 py-2 flex items-center justify-between text-sm">
                <span className="truncate">
                  {k === "assignments" && `${row.worker?.first_name ?? ""} ${row.worker?.last_name ?? ""} · ${row.job?.title ?? ""}`}
                  {k === "invoices" && `Invoice ${row.number}`}
                  {k === "tickets" && `Ticket ${row.ticket_number ?? row.id.slice(0,8)}`}
                </span>
                <span className="text-xs text-muted-foreground">
                  {row.starts_on ?? row.due_at ?? row.work_date ?? ""}
                </span>
              </div>
            ))}
            {!(data?.[k]?.length) && <p className="p-4 text-sm text-muted-foreground">No entries.</p>}
          </div>
        </section>
      ))}
    </div>
  );
}
