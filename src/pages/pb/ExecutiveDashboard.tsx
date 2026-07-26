import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { usePayrollRuns, useInvoices, useMarginAnalysis } from "@/hooks/pb/use-pb";

export default function ExecutiveDashboard() {
  const { agencyId } = useAuth();
  const { data: runs = [] } = usePayrollRuns(agencyId ?? undefined);
  const { data: invoices = [] } = useInvoices(agencyId ?? undefined);
  const { data: margins = [] } = useMarginAnalysis(agencyId ?? undefined);

  const revenue = invoices.reduce((s, i) => s + Number(i.total ?? 0), 0);
  const payrollCost = runs.reduce((s, r) => s + Number((r.totals as Record<string, unknown>)?.gross_pay ?? 0), 0);
  const profit = revenue - payrollCost;
  const receivable = invoices.filter((i) => i.status !== "paid" && i.status !== "void").reduce((s, i) => s + Number(i.total ?? 0), 0);
  const paid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total ?? 0), 0);
  const marginPct = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) + "%" : "—";

  const tiles = [
    { l: "Revenue", v: `$${revenue.toLocaleString()}` },
    { l: "Payroll Cost", v: `$${payrollCost.toLocaleString()}` },
    { l: "Profit", v: `$${profit.toLocaleString()}` },
    { l: "Gross Margin", v: marginPct },
    { l: "Receivables", v: `$${receivable.toLocaleString()}` },
    { l: "Collected", v: `$${paid.toLocaleString()}` },
    { l: "Payables (Payroll)", v: `$${payrollCost.toLocaleString()}` },
    { l: "Margin Snapshots", v: margins.length },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {tiles.map((t) => (
        <Card key={t.l} className="p-4">
          <div className="text-xs text-muted-foreground">{t.l}</div>
          <div className="text-2xl font-semibold mt-1">{t.v}</div>
        </Card>
      ))}
    </div>
  );
}
