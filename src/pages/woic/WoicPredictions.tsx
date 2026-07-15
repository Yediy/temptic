import { useAuth } from "@/lib/auth";
import { useWoicPredictionModels, useWoicPredictionResults } from "@/hooks/use-woic";
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
import type { WoicPredictionModel, WoicPredictionResult } from "@/lib/woic/types";

const modelColumns: DataPanelColumn<WoicPredictionModel>[] = [
  { key: "name", header: "Name", cell: (r) => <span className="font-medium">{r.name}</span> },
  { key: "version", header: "Version", cell: (r) => r.version },
  {
    key: "status",
    header: "Status",
    cell: (r) => <Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge>,
  },
  { key: "endpoint", header: "Endpoint", cell: (r) => <span className="text-xs font-mono">{r.endpoint ?? "—"}</span> },
];

const resultColumns: DataPanelColumn<WoicPredictionResult>[] = [
  { key: "model", header: "Model", cell: (r) => <span className="font-mono text-xs">{short(r.model_id)}</span> },
  {
    key: "subject",
    header: "Subject",
    cell: (r) => <span className="font-mono text-xs">{r.subject_entity}/{short(r.subject_id)}</span>,
  },
  { key: "confidence", header: "Confidence", cell: (r) => fmtPct(r.confidence) },
  { key: "produced_at", header: "Produced", cell: (r) => fmtDate(r.produced_at) },
];

export default function WoicPredictions() {
  const { agencyId } = useAuth();
  const models = useWoicPredictionModels(agencyId ?? undefined);
  const results = useWoicPredictionResults(agencyId ?? undefined);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <DataPanel<WoicPredictionModel>
        title="Registered Models"
        columns={modelColumns}
        rows={models.data as WoicPredictionModel[] | undefined}
        isLoading={models.isLoading}
        error={models.error}
        emptyLabel="No models registered."
        detailTitle={(m) => m.name}
        renderDetail={(m) => (
          <div className="space-y-1">
            <DetailField label="Version" value={m.version} />
            <DetailField label="Status" value={m.status} />
            <DetailField label="Endpoint" value={<span className="font-mono text-xs">{m.endpoint}</span>} />
            <DetailField label="Description" value={m.description} />
            <DetailField label="Created" value={fmtDate(m.created_at)} />
            <DetailJson label="Feature Set" value={m.feature_set} />
          </div>
        )}
      />

      <DataPanel<WoicPredictionResult>
        title="Recent Predictions"
        columns={resultColumns}
        rows={results.data as WoicPredictionResult[] | undefined}
        isLoading={results.isLoading}
        error={results.error}
        emptyLabel="No predictions yet."
        detailTitle={(r) => `Prediction ${short(r.id)}`}
        renderDetail={(r) => (
          <div className="space-y-1">
            <DetailField label="Model" value={<span className="font-mono text-xs">{r.model_id}</span>} />
            <DetailField label="Subject" value={<span className="font-mono text-xs">{r.subject_entity}/{r.subject_id}</span>} />
            <DetailField label="Confidence" value={fmtPct(r.confidence)} />
            <DetailField label="Produced" value={fmtDate(r.produced_at)} />
            <DetailJson label="Prediction" value={r.prediction} />
            <DetailJson label="Features" value={r.features_snapshot} />
          </div>
        )}
      />
    </div>
  );
}
