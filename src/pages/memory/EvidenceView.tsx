import { useState } from "react";
import {
  CapabilityState, ConfidenceMeter, LifecycleBadge, ListControls, MetadataBlock, Pager, Panel,
  PrivacyNotice, RecordTable, RetentionBadge, usePagedRows,
} from "@/components/memory/MemBits";
import { useMemoryList, useMemorySettings, useRowFilter } from "@/hooks/memory/use-memory";
import { asArray, asRecord, formatTime, str } from "@/lib/memory/platform";

export default function EvidenceView() {
  const [settings] = useMemorySettings();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const list = useMemoryList("memory.evidence.list", {}, { refetchInterval: settings.refreshMs });
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);
  const detail = asRecord(selected);

  return (
    <div className="space-y-4">
      <Panel title="Evidence in Working Memory" description="Evidence WOIC is retaining, its provenance and what it supports.">
        <CapabilityState status={list.status} message={list.message} label="retained evidence">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter evidence…" />
          <RecordTable
            rows={paged}
            columns={[
              { key: "summary", label: "Evidence", render: (r) => (
                <button type="button" className="text-left text-primary hover:underline" onClick={() => setSelected(r)}>
                  {str(r.summary ?? r.title, "(no summary reported)")}
                </button>
              ) },
              { key: "source", label: "Source", render: (r) => str(r.source, "—") },
              { key: "supports", label: "Supports", render: (r) => str(r.supports_count ?? asArray(r.supports).length, "—") },
              { key: "confidence", label: "Confidence", render: (r) => <ConfidenceMeter value={r.confidence} /> },
              { key: "retention_class", label: "Retention", render: (r) => <RetentionBadge value={r.retention_class} /> },
              { key: "status", label: "Status", render: (r) => <LifecycleBadge value={r.status ?? r.lifecycle_state} /> },
              { key: "created_at", label: "Created", render: (r) => formatTime(r.created_at) },
            ]}
            empty="No evidence records were reported in working memory."
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {selected && (
        <Panel title="Evidence Detail" description="Provenance and linkage as reported by WOIC.">
          <div className="grid gap-3 lg:grid-cols-2">
            {[
              ["Summary", detail.summary],
              ["Source", detail.source],
              ["Provenance", detail.provenance],
              ["Supports", detail.supports],
              ["Contradicts", detail.contradicts],
              ["Session", detail.session_id],
              ["Request", detail.request_id],
              ["Status", detail.status ?? detail.lifecycle_state],
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
