import { useMemo, useState } from "react";
import {
  CapabilityState, LifecycleBadge, LifecycleFlow, ListControls, MetadataBlock, Pager, Panel,
  PrivacyNotice, RecordTable, RetentionBadge, usePagedRows,
} from "@/components/memory/MemBits";
import { useMemoryCapability, useMemoryList, useMemorySettings, useRowFilter } from "@/hooks/memory/use-memory";
import { asRecord, formatTime, normalizeLifecycle, str } from "@/lib/memory/platform";

/**
 * Lifecycle transitions are reported by WOIC. Eviction and expiry are deletions;
 * promotion is a transfer to durable memory. The two are never conflated.
 */
export default function MemoryLifecycle() {
  const [settings] = useMemorySettings();
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const overview = useMemoryCapability<Record<string, unknown>>(
    "memory.overview", {}, { refetchInterval: settings.refreshMs },
  );
  const list = useMemoryList("memory.lifecycle.list", {}, { refetchInterval: settings.refreshMs });

  const byState = useMemo(() => (
    stateFilter
      ? list.rows.filter((r) => normalizeLifecycle(r.to_state ?? r.state ?? r.status) === stateFilter)
      : list.rows
  ), [list.rows, stateFilter]);
  const filtered = useRowFilter(byState, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);
  const detail = asRecord(selected);
  const counts = asRecord(asRecord(overview.data).lifecycle_counts ?? asRecord(overview.data).lifecycle);

  return (
    <div className="space-y-4">
      <Panel title="Memory Lifecycle" description="Eviction and expiry remove memory. Promotion preserves it in long-term storage.">
        <CapabilityState status={overview.status} message={overview.message} label="lifecycle distribution">
          <LifecycleFlow
            counts={counts}
            selected={stateFilter}
            onSelect={(s) => setStateFilter((prev) => (prev === s ? null : s))}
          />
        </CapabilityState>
      </Panel>

      <Panel title="Lifecycle Transitions" description={stateFilter ? `Filtered to ${stateFilter}.` : "All reported transitions."}>
        <CapabilityState status={list.status} message={list.message} label="lifecycle transitions">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter transitions…" />
          <RecordTable
            rows={paged}
            columns={[
              { key: "item", label: "Item", render: (r) => (
                <button type="button" className="text-left text-primary hover:underline" onClick={() => setSelected(r)}>
                  {str(r.summary ?? r.item_id ?? r.id, "(no item reported)")}
                </button>
              ) },
              { key: "from_state", label: "From", render: (r) => <LifecycleBadge value={r.from_state} /> },
              { key: "to_state", label: "To", render: (r) => <LifecycleBadge value={r.to_state ?? r.state ?? r.status} /> },
              { key: "reason", label: "Reason", render: (r) => str(r.reason, "—") },
              { key: "retention_class", label: "Retention", render: (r) => <RetentionBadge value={r.retention_class} /> },
              { key: "session_id", label: "Session", render: (r) => str(r.session_id, "—") },
              { key: "at", label: "When", render: (r) => formatTime(r.created_at ?? r.at) },
            ]}
            empty="No lifecycle transitions were reported."
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {selected && (
        <Panel title="Transition Detail" description="Reported by WOIC.">
          <div className="grid gap-3 lg:grid-cols-2">
            {[
              ["Item", detail.summary ?? detail.item_id],
              ["From", detail.from_state],
              ["To", detail.to_state ?? detail.state],
              ["Reason", detail.reason],
              ["Promotion Target", detail.promotion_target],
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
