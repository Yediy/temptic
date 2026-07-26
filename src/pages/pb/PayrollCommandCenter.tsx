import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { usePayrollRuns, useInvoices } from "@/hooks/pb/use-pb";

export default function PayrollCommandCenter() {
  const { agencyId } = useAuth();
  const { data: runs = [] } = usePayrollRuns(agencyId ?? undefined);
  const { data: invoices = [] } = useInvoices(agencyId ?? undefined);

  const open = runs.filter((r) => ["draft", "review"].includes(String(r.status))).length;
  const pending = runs.filter((r) => r.status === "review").length;
  const completed = runs.filter((r) => r.status === "paid").length;
  const exceptions = runs.filter((r) => r.status === "exception").length;
  const gross = runs.reduce((s, r) => s + Number((r.totals as Record<string, unknown>)?.gross_pay ?? 0), 0);
  const net = runs.reduce((s, r) => s + Number((r.totals as Record<string, unknown>)?.net_pay ?? 0), 0);
  const outstanding = invoices.filter((i) => i.status !== "paid" && i.status !== "void")
    .reduce((s, i) => s + Number(i.total ?? 0), 0);

  const tiles = [
    { label: "Open Payrolls", value: open },
    { label: "Pending Approvals", value: pending },
    { label: "Completed", value: completed },
    { label: "Exceptions", value: exceptions, tone: "destructive" as const },
    { label: "Total Gross Pay", value: `$${gross.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
    { label: "Net Pay Estimate", value: `$${net.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
    { label: "Outstanding A/R", value: `$${outstanding.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4">
            <div className="text-xs text-muted-foreground">{t.label}</div>
            <div className="text-2xl font-semibold mt-1">
              {t.value}{" "}
              {"tone" in t && t.tone === "destructive" && Number(t.value) > 0 && (
                <Badge variant="destructive" className="ml-1 text-[10px]">alert</Badge>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="font-semibold mb-2">Recent Payroll Runs</div>
        <div className="space-y-2">
          {runs.slice(0, 8).map((r) => (
            <div key={String(r.id)} className="flex items-center justify-between text-sm">
              <div>
                <div className="font-medium">{String(r.name)}</div>
                <div className="text-xs text-muted-foreground">{String(r.period_start)} – {String(r.period_end)}</div>
              </div>
              <Badge variant="secondary">{String(r.status)}</Badge>
            </div>
          ))}
          {runs.length === 0 && <div className="text-sm text-muted-foreground">No payroll runs yet.</div>}
        </div>
      </Card>
    </div>
  );
}
