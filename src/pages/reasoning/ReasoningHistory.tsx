import { useState } from "react";
import {
  CapabilityState, ConclusionStatusBadge, ConfidenceMeter, ListControls, MetadataBlock, Pager, Panel,
  RecordTable, usePagedRows,
} from "@/components/reasoning/ReasonBits";
import { useReasoningList, useReasoningSettings, useRowFilter } from "@/hooks/reasoning/use-reasoning";
import { str } from "@/lib/reasoning/platform";

export default function ReasoningHistory() {
  const [settings] = useReasoningSettings();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const list = useReasoningList("reasoning.history.list", {}, { refetchInterval: settings.refreshMs });
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);
  const detail = filtered.find((r) => str(r.id ?? r.history_id) === open);

  return (
    <div className="space-y-4">
      <Panel
        title="Reasoning History"
        description="Original result, critical review, revision, decision taken and the actual outcome — as recorded by WOIC."
      >
        <CapabilityState status={list.status} message={list.message} label="reasoning history">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter history…" />
          <RecordTable
            rows={paged}
            empty="The Reasoning API returned no history."
            columns={[
              { key: "subject", label: "Subject", render: (r) => (
                <button type="button" className="text-left text-primary hover:underline" onClick={() => setOpen(str(r.id ?? r.history_id))}>
                  {str(r.subject ?? r.conclusion ?? r.id, "—")}
                </button>
              ) },
              { key: "status", label: "Final status", render: (r) => <ConclusionStatusBadge value={r.status} /> },
              { key: "confidence", label: "Confidence", render: (r) => <ConfidenceMeter value={r.confidence} /> },
              { key: "decision", label: "Decision taken" },
              { key: "outcome", label: "Actual outcome" },
              { key: "occurred_at", label: "When" },
            ]}
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {open && detail && (
        <Panel
          title="Reasoning Timeline"
          description={str(detail.subject ?? detail.conclusion, "")}
          actions={<button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => setOpen(null)}>Close</button>}
        >
          <ol className="space-y-2">
            {[
              ["Original result", detail.original],
              ["Critical review", detail.review],
              ["Revision", detail.revision],
              ["Decision taken", detail.decision],
              ["Actual outcome", detail.outcome],
              ["Accuracy assessment reported by WOIC", detail.accuracy],
            ].map(([label, value]) => (
              <li key={String(label)} className="rounded border p-2">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">{String(label)}</p>
                <MetadataBlock value={value} />
              </li>
            ))}
          </ol>
        </Panel>
      )}
    </div>
  );
}
