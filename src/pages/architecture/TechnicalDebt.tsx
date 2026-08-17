import { Panel, RecordTable, RegistryState, SeverityBadge, useRowSearch } from "@/components/architecture/ArchBits";
import { useRegistryList } from "@/hooks/architecture/use-architecture";
import { list, str } from "@/lib/architecture/platform";

export default function TechnicalDebt() {
  const debt = useRegistryList("debt.list");
  const { filtered, input } = useRowSearch(debt.rows);

  return (
    <Panel title="Technical Debt Register" description="Debt items recorded against platform organisms." actions={input}>
      <RegistryState status={debt.status} message={debt.message} label="the technical debt register">
        <RecordTable
          rows={filtered}
          empty="The registry contains no technical debt items."
          columns={[
            { key: "title", label: "Item" },
            { key: "organisms", label: "Organisms", render: (r) => <span className="text-xs">{list(r.organisms ?? r.organism).join(", ") || "—"}</span> },
            { key: "severity", label: "Severity", render: (r) => <SeverityBadge value={r.severity} /> },
            { key: "impact", label: "Impact" },
            { key: "owner", label: "Owner" },
            { key: "status", label: "Status" },
            { key: "raised_at", label: "Raised", render: (r) => <span className="text-xs">{str(r.raised_at ?? r.created_at, "—")}</span> },
            { key: "remediation", label: "Remediation" },
          ]}
        />
      </RegistryState>
    </Panel>
  );
}
