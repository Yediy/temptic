import { Card } from "@/components/ui/card";
import { useTtoTickets } from "@/hooks/tto/use-tto";

export default function TimeTicketDashboard() {
  const { data: submitted } = useTtoTickets({ status: "submitted" });
  const { data: inProgress } = useTtoTickets({ status: "in_progress" });
  const { data: approved } = useTtoTickets({ status: "approved" });
  const { data: payrollReady } = useTtoTickets({ status: "payroll_ready" });

  const stats = [
    { label: "In Progress", value: inProgress?.length ?? 0 },
    { label: "Awaiting Approval", value: submitted?.length ?? 0 },
    { label: "Approved", value: approved?.length ?? 0 },
    { label: "Payroll Ready", value: payrollReady?.length ?? 0 },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
          <div className="text-3xl font-bold mt-1">{s.value}</div>
        </Card>
      ))}
    </div>
  );
}
