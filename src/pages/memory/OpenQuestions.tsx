import { useState } from "react";
import {
  CapabilityState, ConfidenceMeter, ListControls, MetadataBlock, Pager, Panel, PrivacyNotice,
  RecordTable, usePagedRows,
} from "@/components/memory/MemBits";
import { useMemoryList, useMemorySettings, useRowFilter } from "@/hooks/memory/use-memory";
import { asArray, asRecord, str } from "@/lib/memory/platform";

export default function OpenQuestions() {
  const [settings] = useMemorySettings();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const list = useMemoryList("memory.questions.list", {}, { refetchInterval: settings.refreshMs });
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);
  const detail = asRecord(selected);

  return (
    <div className="space-y-4">
      <Panel title="Open Questions" description="Unresolved questions WOIC is holding, and what they block.">
        <CapabilityState status={list.status} message={list.message} label="open cognitive questions">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter questions…" />
          <RecordTable
            rows={paged}
            columns={[
              { key: "question", label: "Question", render: (r) => (
                <button type="button" className="text-left text-primary hover:underline" onClick={() => setSelected(r)}>
                  {str(r.question ?? r.text, "(no question reported)")}
                </button>
              ) },
              { key: "why", label: "Why It Matters", render: (r) => str(r.why ?? r.impact, "—") },
              { key: "affected_claims", label: "Affected Claims", render: (r) => str(r.affected_claim_count ?? asArray(r.affected_claims).length, "—") },
              { key: "confidence_impact", label: "Confidence Impact", render: (r) => <ConfidenceMeter value={r.confidence_impact} label="Impact" /> },
              { key: "suggested_source", label: "Suggested Source", render: (r) => str(r.suggested_source, "—") },
              { key: "status", label: "Status", render: (r) => str(r.status, "—") },
              { key: "faculty", label: "Responsible Faculty", render: (r) => str(r.responsible_faculty ?? r.faculty, "—") },
            ]}
            empty="No open questions were reported."
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {selected && (
        <Panel title="Question Detail" description="Reported by WOIC — the workspace evaluates nothing.">
          <div className="grid gap-3 lg:grid-cols-2">
            {[
              ["Question", detail.question ?? detail.text],
              ["Why It Matters", detail.why ?? detail.impact],
              ["Affected Claims", detail.affected_claims],
              ["Affected Confidence", detail.confidence_impact],
              ["Suggested Information Source", detail.suggested_source],
              ["Status", detail.status],
              ["Responsible Faculty", detail.responsible_faculty ?? detail.faculty],
              ["Session", detail.session_id],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">{String(label)}</p>
                <MetadataBlock value={value} />
              </div>
            ))}
          </div>
        </Panel>
      )}

      <PrivacyNotice />
    </div>
  );
}
