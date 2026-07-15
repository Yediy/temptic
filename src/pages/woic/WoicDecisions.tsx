import { useAuth } from "@/lib/auth";
import { useWoicDecisions } from "@/hooks/use-woic";
import { Badge } from "@/components/ui/badge";
import {
  DataPanel,
  DataPanelColumn,
  DetailField,
  DetailJson,
  fmtDate,
  fmtPct,
  short,
} from "@/components/woic/DataPanel";
import type { WoicDecision } from "@/lib/woic/types";

const riskVariant = (r: string | null): "default" | "destructive" | "secondary" => {
  if (r === "high" || r === "critical") return "destructive";
  if (r === "medium") return "default";
  return "secondary";
};

const columns: DataPanelColumn<WoicDecision>[] = [
  { key: "kind", header: "Kind", cell: (r) => <span className="font-medium">{r.kind}</span> },
  {
    key: "subject",
    header: "Subject",
    cell: (r) => <span className="font-mono text-xs">{r.subject_entity}/{short(r.subject_id)}</span>,
  },
  { key: "confidence", header: "Confidence", cell: (r) => fmtPct(r.confidence) },
  {
    key: "risk",
    header: "Risk",
    cell: (r) => r.risk ? <Badge variant={riskVariant(r.risk)}>{r.risk}</Badge> : "—",
  },
  { key: "outcome", header: "Outcome", cell: (r) => r.outcome ?? "—" },
  { key: "created_at", header: "When", cell: (r) => fmtDate(r.created_at) },
];

export default function WoicDecisions() {
  const { agencyId } = useAuth();
  const { data, isLoading, error } = useWoicDecisions(agencyId ?? undefined, 100);

  return (
    <DataPanel<WoicDecision>
      title="Recent Decisions"
      description="Model or human decisions with reasoning and audit trail."
      columns={columns}
      rows={data as WoicDecision[] | undefined}
      isLoading={isLoading}
      error={error}
      emptyLabel="No decisions logged."
      detailTitle={(d) => `${d.kind} · ${short(d.id)}`}
      renderDetail={(d) => (
        <div className="space-y-1">
          <DetailField label="Kind" value={d.kind} />
          <DetailField label="Subject" value={<span className="font-mono text-xs">{d.subject_entity}/{d.subject_id}</span>} />
          <DetailField label="Confidence" value={fmtPct(d.confidence)} />
          <DetailField label="Risk" value={d.risk} />
          <DetailField label="Impact" value={d.impact} />
          <DetailField label="Outcome" value={d.outcome} />
          <DetailField label="Approver" value={short(d.approver_id)} />
          <DetailField label="Created" value={fmtDate(d.created_at)} />
          <DetailField label="Reasoning" value={d.reasoning} />
          <DetailJson label="Alternatives" value={d.alternative_options} />
          <DetailJson label="Source" value={d.source} />
        </div>
      )}
    />
  );
}
