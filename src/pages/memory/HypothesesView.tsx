import { useState } from "react";
import {
  CapabilityState, ConfidenceMeter, HypothesisBadge, ListControls, MetadataBlock, Pager, Panel,
  PrivacyNotice, RecordTable, usePagedRows,
} from "@/components/memory/MemBits";
import { useMemoryList, useMemorySettings, useRowFilter } from "@/hooks/memory/use-memory";
import { asArray, asRecord, str } from "@/lib/memory/platform";

export default function HypothesesView() {
  const [settings] = useMemorySettings();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const list = useMemoryList("memory.hypotheses.list", {}, { refetchInterval: settings.refreshMs });
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);
  const detail = asRecord(selected);

  return (
    <div className="space-y-4">
      <Panel title="Hypotheses" description="Hypotheses held in working memory with the evidence for and against them.">
        <CapabilityState status={list.status} message={list.message} label="active hypotheses">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter hypotheses…" />
          <RecordTable
            rows={paged}
            columns={[
              { key: "hypothesis", label: "Hypothesis", render: (r) => (
                <button type="button" className="text-left text-primary hover:underline" onClick={() => setSelected(r)}>
                  {str(r.hypothesis ?? r.statement, "(no hypothesis reported)")}
                </button>
              ) },
              { key: "supporting", label: "Supporting", render: (r) => str(r.supporting_count ?? asArray(r.supporting_evidence).length, "—") },
              { key: "contradicting", label: "Contradicting", render: (r) => str(r.contradicting_count ?? asArray(r.contradicting_evidence).length, "—") },
              { key: "confidence", label: "Confidence", render: (r) => <ConfidenceMeter value={r.confidence} /> },
              { key: "status", label: "Status", render: (r) => <HypothesisBadge value={r.status ?? r.state} /> },
              { key: "faculty", label: "Source Faculty", render: (r) => str(r.source_faculty ?? r.faculty, "—") },
              { key: "claims", label: "Related Claims", render: (r) => str(r.related_claim_count ?? asArray(r.related_claims).length, "—") },
            ]}
            empty="No hypotheses were reported."
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {selected && (
        <Panel title="Hypothesis Detail" description="Evidence linkage as reported by WOIC.">
          <div className="grid gap-3 lg:grid-cols-2">
            {[
              ["Hypothesis", detail.hypothesis ?? detail.statement],
              ["Supporting Evidence", detail.supporting_evidence],
              ["Contradicting Evidence", detail.contradicting_evidence],
              ["Confidence", detail.confidence],
              ["Status", detail.status ?? detail.state],
              ["Source Faculty", detail.source_faculty ?? detail.faculty],
              ["Related Claims", detail.related_claims],
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
