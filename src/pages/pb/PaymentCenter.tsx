import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { usePayrollRuns, useInvoices } from "@/hooks/pb/use-pb";

export default function PaymentCenter() {
  const { agencyId } = useAuth();
  const { data: runs = [] } = usePayrollRuns(agencyId ?? undefined);
  const { data: invoices = [] } = useInvoices(agencyId ?? undefined);

  const outstanding = invoices.filter((i) => i.status !== "paid" && i.status !== "void");

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Payroll Runs — Payment Status</h3>
        <div className="space-y-2 text-sm max-h-[60vh] overflow-auto">
          {runs.map((r) => (
            <div key={String(r.id)} className="flex justify-between border-b py-1">
              <div>
                <div className="font-medium">{String(r.name)}</div>
                <div className="text-xs text-muted-foreground">
                  ${Number((r.totals as Record<string, unknown>)?.net_pay ?? 0).toFixed(2)} net
                </div>
              </div>
              <Badge variant={r.status === "paid" ? "default" : "secondary"}>{String(r.status)}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-2">Outstanding Invoices</h3>
        <div className="space-y-2 text-sm max-h-[60vh] overflow-auto">
          {outstanding.map((i) => (
            <div key={String(i.id)} className="flex justify-between border-b py-1">
              <div>
                <div className="font-medium">{String(i.number)}</div>
                <div className="text-xs text-muted-foreground">{String(i.period_start)} – {String(i.period_end)}</div>
              </div>
              <div className="text-right">
                <div>${Number(i.total).toFixed(2)}</div>
                <Badge variant={i.status === "overdue" ? "destructive" : "secondary"}>{String(i.status)}</Badge>
              </div>
            </div>
          ))}
          {outstanding.length === 0 && <div className="text-muted-foreground">All paid.</div>}
        </div>
      </Card>
    </div>
  );
}
