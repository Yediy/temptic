import { useState } from "react";
import {
  CapabilityState, ListControls, MetadataBlock, Pager, Panel, PrivacyNotice, RecordTable,
  UtilizationMeter, usePagedRows,
} from "@/components/memory/MemBits";
import { useMemoryList, useMemorySettings, useRowFilter } from "@/hooks/memory/use-memory";
import { asRecord, formatBytes, formatTime, num, str } from "@/lib/memory/platform";

/** Compression is performed by WOIC. This page reports what it did. */
export default function CompressionView() {
  const [settings] = useMemorySettings();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const list = useMemoryList("memory.compression.list", {}, { refetchInterval: settings.refreshMs });
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);
  const detail = asRecord(selected);

  return (
    <div className="space-y-4">
      <Panel title="Compression" description="Compression events reported by WOIC, with the ratio and provenance it preserved.">
        <CapabilityState status={list.status} message={list.message} label="compression events">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter compression events…" />
          <RecordTable
            rows={paged}
            columns={[
              { key: "session_id", label: "Session", render: (r) => (
                <button type="button" className="text-left text-primary hover:underline" onClick={() => setSelected(r)}>
                  {str(r.session_id ?? r.id, "(no session reported)")}
                </button>
              ) },
              { key: "created_at", label: "When", render: (r) => formatTime(r.created_at ?? r.compressed_at) },
              { key: "original_size", label: "Original", render: (r) => formatBytes(r.original_size_bytes ?? r.original_size) },
              { key: "compressed_size", label: "Compressed", render: (r) => formatBytes(r.compressed_size_bytes ?? r.compressed_size) },
              { key: "ratio", label: "Ratio", render: (r) => {
                const v = num(r.compression_ratio ?? r.ratio);
                return v == null ? "—" : `${v <= 1 ? Math.round(v * 100) : Math.round(v)}%`;
              } },
              { key: "items_collapsed", label: "Items Collapsed", render: (r) => str(r.items_collapsed, "—") },
              { key: "provenance_preserved", label: "Provenance Preserved", render: (r) => (
                r.provenance_preserved == null ? "—" : <UtilizationMeter value={r.provenance_preserved} label="Provenance" />
              ) },
            ]}
            empty="No compression events were reported."
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {selected && (
        <Panel
          title="Resulting Structured Summary"
          description="The structured artifact WOIC produced. This is not model reasoning and is never reconstructed here."
        >
          <MetadataBlock value={detail.summary ?? detail.structured_summary} />
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {[
              ["Collapsed Items", detail.collapsed_items],
              ["Preserved Provenance", detail.provenance],
              ["Retained References", detail.references],
              ["Reason", detail.reason],
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
