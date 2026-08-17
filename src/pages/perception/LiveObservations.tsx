import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ListControls, MetadataBlock, Pager, Panel, RecordTable, usePagedRows,
} from "@/components/cognition/CogBits";
import {
  CapabilityState, FreshnessBadge, PrivacyNotice, RestrictedNotice, ScoreMeter, SeverityBadge,
} from "@/components/perception/PerceptionBits";
import {
  usePerceptionCapability, usePerceptionList, usePerceptionSettings, usePinnedObservations, useRowFilter,
} from "@/hooks/perception/use-perception";
import { FRESHNESS_STATES, asArray, formatTime, str } from "@/lib/perception/platform";

export default function LiveObservations() {
  const [settings, setSettings] = usePerceptionSettings();
  const [query, setQuery] = useState("");
  const [freshness, setFreshness] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const { pins, toggle } = usePinnedObservations();

  const paused = settings.streamPaused;
  const list = usePerceptionList(
    "observations.list",
    freshness ? { freshness } : {},
    { refetchInterval: paused ? false : settings.refreshMs },
  );
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);

  const detail = usePerceptionCapability<Record<string, unknown>>(
    "observations.get", { observation_id: openId }, { enabled: !!openId },
  );
  const record = detail.data ?? {};
  const pinnedRows = filtered.filter((r) => pins.includes(str(r.id)));

  const columns = [
    { key: "occurred_at", label: "Time", render: (r: Record<string, unknown>) => formatTime(r.occurred_at ?? r.time ?? r.created_at) },
    { key: "source", label: "Source" },
    { key: "observation_type", label: "Type", render: (r: Record<string, unknown>) => str(r.observation_type ?? r.type, "—") },
    { key: "primary_entity", label: "Primary Entity", render: (r: Record<string, unknown>) => str(r.primary_entity, "—") },
    { key: "related_entities", label: "Related", render: (r: Record<string, unknown>) => {
      const rel = asArray(r.related_entities);
      return rel.length ? `${rel.length}` : Array.isArray(r.related_entities) ? String((r.related_entities as unknown[]).length) : "—";
    } },
    { key: "summary", label: "Summary", render: (r: Record<string, unknown>) => (
      <button type="button" className="text-left text-primary hover:underline" onClick={() => setOpenId(str(r.id))}>
        {str(r.summary ?? r.id, "(no summary reported)")}
      </button>
    ) },
    { key: "confidence", label: "Confidence", render: (r: Record<string, unknown>) => <ScoreMeter value={r.confidence} label="Confidence" /> },
    { key: "reliability", label: "Reliability", render: (r: Record<string, unknown>) => <ScoreMeter value={r.reliability} label="Reliability" /> },
    { key: "freshness", label: "Freshness", render: (r: Record<string, unknown>) => <FreshnessBadge value={r.freshness} /> },
    { key: "salience", label: "Salience", render: (r: Record<string, unknown>) => <ScoreMeter value={r.salience} label="Salience" /> },
    { key: "severity", label: "Severity", render: (r: Record<string, unknown>) => <SeverityBadge value={r.severity} /> },
    { key: "permissions", label: "Permissions", render: (r: Record<string, unknown>) =>
      r.permission_restricted ? <RestrictedNotice /> : str(r.permissions ?? r.permission_scope, "—") },
    { key: "status", label: "Status" },
    { key: "pin", label: "Pin", render: (r: Record<string, unknown>) => (
      <Button type="button" size="sm" variant="ghost" onClick={() => toggle(str(r.id))}>
        {pins.includes(str(r.id)) ? "Unpin" : "Pin"}
      </Button>
    ) },
  ];

  return (
    <div className="space-y-4">
      <Panel
        title="Live Observations"
        description="Everything WOIC observed, with provenance. Ordering and scoring come from 6.1A."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">
              {paused ? "stream paused" : list.isFetching ? "refreshing…" : "streaming"}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSettings({ ...settings, streamPaused: !paused })}
            >
              {paused ? "Resume" : "Pause"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={list.refetch}>Refresh</Button>
          </div>
        }
      >
        <CapabilityState status={list.status} message={list.message} label="the observation stream">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Search observations…">
            <select
              value={freshness}
              onChange={(e) => setFreshness(e.target.value)}
              aria-label="Filter by freshness"
              className="h-8 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">All freshness</option>
              {FRESHNESS_STATES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </ListControls>
          <RecordTable rows={paged} columns={columns} />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {pinnedRows.length > 0 && (
        <Panel title="Pinned Observations" description="Kept in view while the stream moves.">
          <RecordTable rows={pinnedRows} columns={columns} />
        </Panel>
      )}

      {openId && (
        <Panel
          title="Observation Inspector"
          description="Provenance and operational metadata for the selected observation."
          actions={<Button type="button" size="sm" variant="ghost" onClick={() => setOpenId(null)}>Close</Button>}
        >
          <CapabilityState status={detail.status} message={detail.message} label="this observation">
            <MetadataBlock value={record} />
          </CapabilityState>
        </Panel>
      )}

      <PrivacyNotice />
    </div>
  );
}
