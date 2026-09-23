import { useState } from "react";
import {
  CapabilityState, ConfidenceMeter, HypothesisStatusBadge, ListControls, MetadataBlock, Pager, Panel,
  RecordTable, StanceBadge, usePagedRows,
} from "@/components/reasoning/ReasonBits";
import { useReasoningList, useReasoningSettings, useRowFilter } from "@/hooks/reasoning/use-reasoning";
import { asArray, str } from "@/lib/reasoning/platform";

export default function HypothesesExplorer() {
  const [settings] = useReasoningSettings();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const list = useReasoningList("reasoning.hypotheses.list", {}, { refetchInterval: settings.refreshMs });
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);
  const detail = filtered.find((r) => str(r.id ?? r.hypothesis_id) === open);

  return (
    <div className="space-y-4">
      <Panel
        title="Hypotheses"
        description="Hypotheses WOIC is holding, testing, supporting or refuting. Statuses come from 6.3A only."
      >
        <CapabilityState status={list.status} message={list.message} label="hypotheses">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter hypotheses…" />
          <RecordTable
            rows={paged}
            empty="The Reasoning API returned no hypotheses."
            columns={[
              { key: "hypothesis", label: "Hypothesis", render: (r) => (
                <button type="button" className="text-left text-primary hover:underline" onClick={() => setOpen(str(r.id ?? r.hypothesis_id))}>
                  {str(r.hypothesis ?? r.statement ?? r.id, "—")}
                </button>
              ) },
              { key: "status", label: "Status", render: (r) => <HypothesisStatusBadge value={r.status} /> },
              { key: "confidence", label: "Confidence", render: (r) => <ConfidenceMeter value={r.confidence} /> },
              { key: "supporting_count", label: "Supporting" },
              { key: "contradicting_count", label: "Contradicting" },
              { key: "updated_at", label: "Updated" },
            ]}
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {open && detail && (
        <Panel
          title="Hypothesis"
          description={str(detail.hypothesis ?? detail.statement, "")}
          actions={<button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => setOpen(null)}>Close</button>}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded border p-2">
              <p className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                Supporting evidence <StanceBadge value="SUPPORTS" />
              </p>
              <MetadataBlock value={detail.supporting_evidence} />
            </div>
            <div className="rounded border border-red-500/40 p-2">
              <p className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                Contradicting evidence <StanceBadge value="CONTRADICTS" />
              </p>
              <MetadataBlock value={detail.contradicting_evidence} />
            </div>
            <div className="rounded border p-2">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">What would confirm this</p>
              <MetadataBlock value={detail.confirming_tests ?? detail.what_would_confirm} />
            </div>
            <div className="rounded border p-2">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">What would refute this</p>
              <MetadataBlock value={detail.refuting_tests ?? detail.what_would_refute} />
            </div>
            <div className="rounded border p-2 md:col-span-2">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Linked conclusions &amp; requests</p>
              <MetadataBlock value={detail.links ?? { conclusions: asArray(detail.conclusions), requests: asArray(detail.requests) }} />
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
