import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  CapabilityState, ConfidenceMeter, LifecycleBadge, ListControls, MetadataBlock, Pager, Panel,
  PrivacyNotice, RecordTable, RetentionBadge, UtilizationMeter, usePagedRows,
} from "@/components/memory/MemBits";
import { useMemoryList, useMemorySettings, useRowFilter } from "@/hooks/memory/use-memory";
import { asRecord, formatTime, str } from "@/lib/memory/platform";

const FILTERS: Array<{ key: string; label: string; placeholder: string }> = [
  { key: "session_id", label: "Session", placeholder: "session id" },
  { key: "request_id", label: "Request", placeholder: "request id" },
  { key: "faculty", label: "Faculty", placeholder: "faculty" },
  { key: "type", label: "Type", placeholder: "item type" },
  { key: "priority", label: "Priority", placeholder: "priority" },
  { key: "max_age_minutes", label: "Age (min)", placeholder: "minutes" },
  { key: "status", label: "Status", placeholder: "status" },
];

export default function MemoryItems() {
  const [settings] = useMemorySettings();
  const [query, setQuery] = useState("");
  const [params, setParams] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const applied = Object.fromEntries(Object.entries(params).filter(([, v]) => v.trim() !== ""));
  const list = useMemoryList("memory.items.list", applied, { refetchInterval: settings.refreshMs });
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);
  const detail = asRecord(selected);

  return (
    <div className="space-y-4">
      <Panel title="Memory Item Explorer" description="Every item WOIC reports as held, compressed, evicted or expired.">
        <div className="mb-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
          {FILTERS.map((f) => (
            <div key={f.key}>
              <label htmlFor={`f-${f.key}`} className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
                {f.label}
              </label>
              <Input
                id={`f-${f.key}`}
                value={params[f.key] ?? ""}
                onChange={(e) => setParams((p) => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="h-8 text-xs"
              />
            </div>
          ))}
        </div>

        <CapabilityState status={list.status} message={list.message} label="working-memory items">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter items…" />
          <RecordTable
            rows={paged}
            columns={[
              { key: "type", label: "Type", render: (r) => str(r.type, "—") },
              { key: "summary", label: "Summary", render: (r) => (
                <button type="button" className="text-left text-primary hover:underline" onClick={() => setSelected(r)}>
                  {str(r.summary ?? r.title, "(no summary reported)")}
                </button>
              ) },
              { key: "source", label: "Source", render: (r) => str(r.source, "—") },
              { key: "priority", label: "Priority", render: (r) => str(r.priority, "—") },
              { key: "salience", label: "Salience", render: (r) => <UtilizationMeter value={r.salience} label="Salience" /> },
              { key: "confidence", label: "Confidence", render: (r) => <ConfidenceMeter value={r.confidence} /> },
              { key: "freshness", label: "Freshness", render: (r) => str(r.freshness, "—") },
              { key: "created_at", label: "Created", render: (r) => formatTime(r.created_at) },
              { key: "last_accessed_at", label: "Last Accessed", render: (r) => formatTime(r.last_accessed_at) },
              { key: "expires_at", label: "Expires", render: (r) => formatTime(r.expires_at) },
              { key: "retention_class", label: "Retention", render: (r) => <RetentionBadge value={r.retention_class} /> },
              { key: "status", label: "Status", render: (r) => <LifecycleBadge value={r.status ?? r.lifecycle_state} /> },
            ]}
            empty="No working-memory items were reported for this filter."
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {selected && (
        <Panel title="Memory Item Detail" description="Provenance and linkage as reported by WOIC.">
          <div className="grid gap-3 lg:grid-cols-2">
            {[
              ["Summary", detail.summary],
              ["Type", detail.type],
              ["Source", detail.source],
              ["Evidence", detail.evidence],
              ["Claims", detail.claims],
              ["Session", detail.session_id],
              ["Request", detail.request_id],
              ["Faculty", detail.faculty],
              ["Retention Class", detail.retention_class],
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
