import { useAuth } from "@/lib/auth";
import { useWoicComplianceAlerts } from "@/hooks/use-woic";
import { Badge } from "@/components/ui/badge";
import {
  DataPanel,
  DataPanelColumn,
  DetailField,
  DetailJson,
  fmtDate,
  short,
} from "@/components/woic/DataPanel";
import type { WoicComplianceEvent } from "@/lib/woic/types";

const statusVariant = (s: string): "default" | "destructive" | "secondary" | "outline" => {
  if (s === "open") return "destructive";
  if (s === "resolved") return "default";
  return "secondary";
};

const columns: DataPanelColumn<WoicComplianceEvent>[] = [
  {
    key: "identity",
    header: "Identity",
    cell: (r) => <span className="font-mono text-xs">{short(r.identity_id)}</span>,
  },
  {
    key: "rule",
    header: "Rule",
    cell: (r) => <span className="font-mono text-xs">{short(r.rule_id)}</span>,
  },
  {
    key: "status",
    header: "Status",
    cell: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge>,
  },
  { key: "next_action_at", header: "Next Action", cell: (r) => fmtDate(r.next_action_at) },
  { key: "expires_at", header: "Expires", cell: (r) => fmtDate(r.expires_at) },
];

export default function WoicCompliance() {
  const { agencyId } = useAuth();
  const { data, isLoading, error } = useWoicComplianceAlerts(agencyId ?? undefined, 200);

  return (
    <DataPanel<WoicComplianceEvent>
      title="Compliance Events"
      description="Rule matches requiring review, action, or expiration tracking."
      columns={columns}
      rows={data as WoicComplianceEvent[] | undefined}
      isLoading={isLoading}
      error={error}
      emptyLabel="No open compliance events."
      detailTitle={(e) => `Event ${short(e.id)}`}
      renderDetail={(e) => (
        <div className="space-y-1">
          <DetailField label="Identity" value={<span className="font-mono text-xs">{e.identity_id}</span>} />
          <DetailField label="Rule" value={<span className="font-mono text-xs">{e.rule_id}</span>} />
          <DetailField label="Status" value={<Badge variant={statusVariant(e.status)}>{e.status}</Badge>} />
          <DetailField label="Effective" value={fmtDate(e.effective_at)} />
          <DetailField label="Expires" value={fmtDate(e.expires_at)} />
          <DetailField label="Next Action" value={fmtDate(e.next_action_at)} />
          <DetailField
            label="Evidence"
            value={
              e.evidence_url ? (
                <a href={e.evidence_url} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">
                  {e.evidence_url}
                </a>
              ) : null
            }
          />
          <DetailField label="Created" value={fmtDate(e.created_at)} />
          <DetailField label="Updated" value={fmtDate(e.updated_at)} />
          <DetailJson label="Metadata" value={e.metadata} />
        </div>
      )}
    />
  );
}
