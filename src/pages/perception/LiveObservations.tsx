import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ListControls, MetadataBlock, Pager, Panel, RecordTable, usePagedRows,
} from "@/components/cognition/CogBits";
import {
  CapabilityState, FreshnessBadge, PrivacyNotice, RestrictedNotice, ScoreMeter, SeverityBadge,
} from "@/components/perception/PerceptionBits";
import { usePerceptionSettings } from "@/hooks/perception/use-perception";
import { useObservationPins, useObservationSources, useObservationStream } from "@/hooks/perception/use-observation-stream";
import { toObservation, type Freshness } from "@/lib/perception/observation-stream";
import { asArray, formatTime, str } from "@/lib/perception/platform";

const FRESHNESS: Freshness[] = ["CURRENT", "AGING", "STALE", "EXPIRED"];

export default function LiveObservations() {
  const [settings] = usePerceptionSettings();
  const [query, setQuery] = useState("");
  const [freshness, setFreshness] = useState<Freshness | "">("");
  const [source, setSource] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const stream = useObservationStream({ search: query, freshness, source });
  const { data: sources = [] } = useObservationSources();
  const { ids: pins, events: pinnedEvents, toggle } = useObservationPins();
  const paused = stream.paused;

  const filtered = useMemo(() => stream.events.map((e) => toObservation(e)), [stream.events]);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);
  const pinnedRows = useMemo(() => pinnedEvents.map((e) => toObservation(e)), [pinnedEvents]);
  const record = [...filtered, ...pinnedRows].find((r) => r.id === openId) ?? {};
  const status = stream.loading && !filtered.length ? "loading" : stream.error ? "error" : "ok";

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
        description="Live observations from the Event Fabric. Search and filters run on the server; pins are saved to your account."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">
              {paused ? `paused · ${stream.pending} new held` : stream.connected ? "streaming live" : "polling"}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => stream.setPaused(!paused)}
            >
              {paused ? "Resume" : "Pause"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => void stream.refresh()}>Refresh</Button>
          </div>
        }
      >
        <CapabilityState status={status} message={stream.error} label="the observation stream">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Search observations…">
            <select
              value={freshness}
              onChange={(e) => setFreshness(e.target.value as Freshness | "")}
              aria-label="Filter by freshness"
              className="h-8 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">All freshness</option>
              {FRESHNESS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Filter by source"
              className="h-8 rounded-md border bg-background px-2 text-sm">
              <option value="">All sources</option>
              {sources.map((m) => <option key={m} value={m}>{m}</option>)}
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
          <MetadataBlock value={record} />
        </Panel>
      )}

      <PrivacyNotice />
    </div>
  );
}
