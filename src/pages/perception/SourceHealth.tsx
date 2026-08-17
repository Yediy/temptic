import { useState } from "react";
import { ListControls, MetadataBlock, Pager, Panel, RecordTable, usePagedRows } from "@/components/cognition/CogBits";
import {
  CapabilityState, PrivacyNotice, RestrictedNotice, ScoreMeter, SourceHealthBadge,
} from "@/components/perception/PerceptionBits";
import { usePerceptionList, usePerceptionSettings, useRowFilter } from "@/hooks/perception/use-perception";
import { PERCEPTION_SOURCES, SOURCE_HEALTH_STATES, formatTime, str } from "@/lib/perception/platform";

export default function SourceHealth() {
  const [settings] = usePerceptionSettings();
  const [query, setQuery] = useState("");
  const [health, setHealth] = useState("");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const list = usePerceptionList(
    "sources.health",
    health ? { status: health } : {},
    { refetchInterval: settings.refreshMs },
  );
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);

  return (
    <div className="space-y-4">
      <Panel
        title="Source Health"
        description="Availability of every perception source and external adapter, as reported by 6.1A."
      >
        <CapabilityState status={list.status} message={list.message} label="perception source health">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter sources…">
            <select
              value={health}
              onChange={(e) => setHealth(e.target.value)}
              aria-label="Filter by source health"
              className="h-8 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">All states</option>
              {SOURCE_HEALTH_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </ListControls>
          <RecordTable
            rows={paged}
            columns={[
              { key: "source", label: "Source", render: (r) => (
                <button type="button" className="text-left text-primary hover:underline" onClick={() => setSelected(r)}>
                  {str(r.source ?? r.name ?? r.id, "(unnamed source)")}
                </button>
              ) },
              { key: "status", label: "Status", render: (r) => <SourceHealthBadge value={r.status ?? r.health} /> },
              { key: "last_ingest", label: "Last Ingest", render: (r) => formatTime(r.last_ingest ?? r.last_seen_at) },
              { key: "volume", label: "Volume", render: (r) => str(r.volume ?? r.event_count, "—") },
              { key: "error_rate", label: "Error Rate", render: (r) => <ScoreMeter value={r.error_rate} label="Error rate" /> },
              { key: "latency", label: "Latency", render: (r) => str(r.latency ?? r.latency_ms, "—") },
              { key: "reliability", label: "Reliability", render: (r) => <ScoreMeter value={r.reliability} label="Reliability" /> },
              { key: "permission", label: "Permission", render: (r) =>
                r.permission_restricted ? <RestrictedNotice /> : str(r.permission_scope, "—") },
            ]}
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {selected && (
        <Panel title="Source Detail" description="Operational metadata only; source contents are not displayed here.">
          <MetadataBlock value={selected} />
        </Panel>
      )}

      <Panel
        title="Known Perception Sources"
        description="Sources the workspace can display health for. Presence in this list is not a health claim."
      >
        <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {PERCEPTION_SOURCES.map((s) => (
            <li key={s.key} className="rounded-md border p-2">
              <p className="text-xs font-semibold">{s.label}</p>
              <p className="text-[11px] text-muted-foreground">{s.detail}</p>
            </li>
          ))}
        </ul>
      </Panel>

      <PrivacyNotice />
    </div>
  );
}
