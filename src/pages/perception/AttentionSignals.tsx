import { useState } from "react";
import { Link } from "react-router-dom";
import { ListControls, MetadataBlock, Pager, Panel, RecordTable, usePagedRows } from "@/components/cognition/CogBits";
import { CapabilityState, PrivacyNotice, ScoreMeter, SeverityBadge } from "@/components/perception/PerceptionBits";
import { usePerceptionList, usePerceptionSettings, useRowFilter } from "@/hooks/perception/use-perception";
import { asArray, str } from "@/lib/perception/platform";

export default function AttentionSignals() {
  const [settings] = usePerceptionSettings();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const list = usePerceptionList("attention.signals", {}, { refetchInterval: settings.refreshMs });
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);

  return (
    <div className="space-y-4">
      <Panel
        title="Attention Signals"
        description="Salient signals reported by WOIC. Salience and urgency come from 6.1A — nothing is scored here."
        actions={<Link to="/oic" className="text-xs text-primary hover:underline">Open Mission Control</Link>}
      >
        <CapabilityState status={list.status} message={list.message} label="attention signals">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter signals…" />
          <RecordTable
            rows={paged}
            columns={[
              { key: "signal", label: "Signal", render: (r) => (
                <button type="button" className="text-left text-primary hover:underline" onClick={() => setSelected(r)}>
                  {str(r.signal ?? r.title ?? r.id, "(unnamed signal)")}
                </button>
              ) },
              { key: "urgency", label: "Urgency", render: (r) => <SeverityBadge value={r.urgency} /> },
              { key: "impact", label: "Impact", render: (r) => <ScoreMeter value={r.impact} label="Impact" /> },
              { key: "risk", label: "Risk", render: (r) => <SeverityBadge value={r.risk} /> },
              { key: "confidence", label: "Confidence", render: (r) => <ScoreMeter value={r.confidence} label="Confidence" /> },
              { key: "affected_entities", label: "Affected Entities", render: (r) => {
                const n = asArray(r.affected_entities).length;
                return n ? `${n}` : str(r.affected_entities, "—");
              } },
              { key: "source_observations", label: "Source Observations", render: (r) => {
                const n = asArray(r.source_observations).length;
                return n ? `${n}` : str(r.source_observations, "—");
              } },
              { key: "recommended_attention_level", label: "Recommended Attention", render: (r) =>
                str(r.recommended_attention_level ?? r.attention_level, "—") },
            ]}
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {selected && (
        <Panel title="Signal Detail" description="Provenance for this signal, verbatim from the Perception API.">
          <MetadataBlock value={selected} />
        </Panel>
      )}

      <Panel
        title="Mission Control"
        description="High-priority signals surface alongside operational risk in the Operational Intelligence Center."
      >
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          <li><Link to="/oic" className="text-primary hover:underline">Mission Control Wall</Link></li>
          <li><Link to="/oic/risk" className="text-primary hover:underline">Risk Center</Link></li>
        </ul>
      </Panel>

      <PrivacyNotice />
    </div>
  );
}
