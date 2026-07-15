import { useAuth } from "@/lib/auth";
import { useWoicLearningHistory } from "@/hooks/use-woic";
import { Badge } from "@/components/ui/badge";
import {
  DataPanel,
  DataPanelColumn,
  DetailField,
  DetailJson,
  fmtDate,
  short,
} from "@/components/woic/DataPanel";
import type { WoicLearningRecord } from "@/lib/woic/types";

const columns: DataPanelColumn<WoicLearningRecord>[] = [
  { key: "kind", header: "Kind", cell: (r) => <Badge variant="outline">{r.kind}</Badge> },
  {
    key: "subject",
    header: "Subject",
    cell: (r) => <span className="font-mono text-xs">{r.subject_entity}/{short(r.subject_id)}</span>,
  },
  {
    key: "prediction",
    header: "Prediction",
    cell: (r) => <span className="font-mono text-xs">{short(r.prediction_id)}</span>,
  },
  { key: "created_at", header: "Recorded", cell: (r) => fmtDate(r.created_at) },
];

export default function WoicLearning() {
  const { agencyId } = useAuth();
  const { data, isLoading, error } = useWoicLearningHistory(agencyId ?? undefined, 200);

  return (
    <DataPanel<WoicLearningRecord>
      title="Learning Signals"
      description="Outcome feedback fed back into prediction and recommendation models."
      columns={columns}
      rows={data as WoicLearningRecord[] | undefined}
      isLoading={isLoading}
      error={error}
      emptyLabel="No learning signals captured yet."
      detailTitle={(r) => `${r.kind} · ${short(r.id)}`}
      renderDetail={(r) => (
        <div className="space-y-1">
          <DetailField label="Kind" value={r.kind} />
          <DetailField label="Subject" value={<span className="font-mono text-xs">{r.subject_entity}/{r.subject_id}</span>} />
          <DetailField label="Prediction ID" value={r.prediction_id} />
          <DetailField label="Recorded" value={fmtDate(r.created_at)} />
          <DetailJson label="Outcome" value={r.outcome} />
        </div>
      )}
    />
  );
}
