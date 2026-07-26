import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { usePayrollRuns, useInvoices, useCommissionRecords, useMarginAnalysis } from "@/hooks/pb/use-pb";

function csv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}
function download(name: string, content: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export default function PbAnalytics() {
  const { agencyId } = useAuth();
  const { data: runs = [] } = usePayrollRuns(agencyId ?? undefined);
  const { data: invs = [] } = useInvoices(agencyId ?? undefined);
  const { data: comms = [] } = useCommissionRecords(agencyId ?? undefined);
  const { data: margins = [] } = useMarginAnalysis(agencyId ?? undefined);

  const reports = [
    { label: "Payroll runs", data: runs, file: "payroll-runs.csv" },
    { label: "Invoices", data: invs, file: "invoices.csv" },
    { label: "Commissions", data: comms, file: "commissions.csv" },
    { label: "Margin analysis", data: margins, file: "margin-analysis.csv" },
  ];

  return (
    <div className="grid md:grid-cols-2 gap-3">
      {reports.map((r) => (
        <Card key={r.label} className="p-4 flex items-center justify-between">
          <div>
            <div className="font-semibold">{r.label}</div>
            <div className="text-xs text-muted-foreground">{r.data.length} rows</div>
          </div>
          <button className="text-sm underline" onClick={() => download(r.file, csv(r.data as Record<string, unknown>[]))}>
            Export CSV
          </button>
        </Card>
      ))}
      <Card className="p-4 md:col-span-2 text-xs text-muted-foreground">
        <Badge variant="secondary" className="mr-2">Note</Badge>
        Additional reports (revenue trend, worker cost analysis, client profitability charts) render from the same data — filter and export from here.
      </Card>
    </div>
  );
}
