import { useState } from "react";
import { ListControls, MetadataBlock, Pager, Panel, RecordTable, usePagedRows } from "@/components/cognition/CogBits";
import { CapabilityState, PrivacyNotice, ScoreMeter, SeverityBadge, UnresolvedFlag } from "@/components/perception/PerceptionBits";
import { usePerceptionList, usePerceptionSettings, useRowFilter } from "@/hooks/perception/use-perception";
import { str } from "@/lib/perception/platform";

export default function MissingInformation() {
  const [settings] = usePerceptionSettings();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const list = usePerceptionList("missing.list", {}, { refetchInterval: settings.refreshMs });
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);

  return (
    <div className="space-y-4">
      <Panel
        title="Missing Information"
        description="Gaps WOIC declared. Unknowns are shown as unknowns — nothing is filled in on the client."
        tone="warn"
      >
        <CapabilityState status={list.status} message={list.message} label="declared information gaps">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter gaps…" />
          <RecordTable
            rows={paged}
            columns={[
              { key: "missing_item", label: "Missing Item", render: (r) => (
                <button type="button" className="text-left text-primary hover:underline" onClick={() => setSelected(r)}>
                  {str(r.missing_item ?? r.item ?? r.id, "(unnamed gap)")}
                </button>
              ) },
              { key: "why_needed", label: "Why Needed", render: (r) => str(r.why_needed ?? r.reason, "—") },
              { key: "impact_on_confidence", label: "Impact on Confidence", render: (r) => (
                <ScoreMeter value={r.impact_on_confidence} label="Confidence impact" />
              ) },
              { key: "severity", label: "Severity", render: (r) => <SeverityBadge value={r.severity} /> },
              { key: "blocking_status", label: "Blocking", render: (r) =>
                r.blocking ? <UnresolvedFlag>blocking</UnresolvedFlag> : str(r.blocking_status ?? r.blocking, "—") },
              { key: "recommended_resolution", label: "Recommended Resolution", render: (r) =>
                str(r.recommended_resolution, "—") },
              { key: "requesting_faculty", label: "Requesting Faculty", render: (r) => str(r.requesting_faculty, "—") },
            ]}
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {selected && (
        <Panel title="Gap Detail" description="Reported verbatim by the Perception & Context API.">
          <MetadataBlock value={selected} />
        </Panel>
      )}

      <PrivacyNotice />
    </div>
  );
}
