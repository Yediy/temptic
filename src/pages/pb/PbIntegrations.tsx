import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PROVIDERS = [
  { slug: "quickbooks", name: "QuickBooks", desc: "Sync invoices, payments, and journal entries." },
  { slug: "adp", name: "ADP", desc: "Push payroll batches for processing." },
  { slug: "paychex", name: "Paychex", desc: "Push payroll batches for processing." },
  { slug: "gusto", name: "Gusto", desc: "Push payroll batches for processing." },
  { slug: "stripe", name: "Stripe", desc: "Collect invoice payments." },
  { slug: "plaid", name: "Plaid", desc: "Bank-linked ACH transfers." },
  { slug: "erp", name: "Generic ERP", desc: "Export to any ERP via CSV or webhook." },
  { slug: "accounting", name: "Accounting Platforms", desc: "Xero, NetSuite, Sage exports." },
];

export default function PbIntegrations() {
  return (
    <div className="grid md:grid-cols-2 gap-3">
      {PROVIDERS.map((p) => (
        <Card key={p.slug} className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">{p.name}</div>
              <div className="text-xs text-muted-foreground">{p.desc}</div>
            </div>
            <Badge variant="secondary">activation pending</Badge>
          </div>
        </Card>
      ))}
      <Card className="p-4 md:col-span-2 text-xs text-muted-foreground">
        Providers activate once API keys are configured in project secrets. Payroll and invoice exports remain available as CSV under Analytics until integrations are enabled.
      </Card>
    </div>
  );
}
