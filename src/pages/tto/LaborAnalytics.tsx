import { Card } from "@/components/ui/card";
import { useTtoTickets } from "@/hooks/tto/use-tto";

export default function LaborAnalytics() {
  const { data: all } = useTtoTickets({});
  const tickets = all ?? [];
  const totalHours = tickets.reduce((s, t) => s + Number(t.regular_hours ?? 0) + Number(t.overtime_hours ?? 0) + Number(t.double_time_hours ?? 0), 0);
  const otHours = tickets.reduce((s, t) => s + Number(t.overtime_hours ?? 0) + Number(t.double_time_hours ?? 0), 0);
  const approved = tickets.filter((t) => ["approved", "payroll_ready", "billing_ready", "closed"].includes(t.status)).length;
  const rejected = tickets.filter((t) => t.status === "rejected").length;
  const otRate = totalHours ? ((otHours / totalHours) * 100).toFixed(1) : "0.0";
  const approvalRate = tickets.length ? ((approved / tickets.length) * 100).toFixed(0) : "0";

  const cells = [
    { label: "Total Hours", value: totalHours.toFixed(1) },
    { label: "OT %", value: `${otRate}%` },
    { label: "Approval Rate", value: `${approvalRate}%` },
    { label: "Rejected", value: rejected },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cells.map((c) => (
        <Card key={c.label} className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</div>
          <div className="text-3xl font-bold mt-1">{c.value}</div>
        </Card>
      ))}
    </div>
  );
}
