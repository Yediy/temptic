import { useState } from "react";
import { ListControls, MetadataBlock, Pager, Panel, RecordTable, usePagedRows } from "@/components/cognition/CogBits";
import { CapabilityState, PrivacyNotice, ResolutionBadge, ScoreMeter } from "@/components/perception/PerceptionBits";
import { usePerceptionList, usePerceptionSettings, useRowFilter } from "@/hooks/perception/use-perception";
import { RESOLUTION_STATES, asArray, str } from "@/lib/perception/platform";

export default function EntityResolution() {
  const [settings] = usePerceptionSettings();
  const [query, setQuery] = useState("");
  const [state, setState] = useState("");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const list = usePerceptionList(
    "entities.resolutions",
    state ? { status: state } : {},
    { refetchInterval: settings.refreshMs },
  );
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);

  return (
    <div className="space-y-4">
      <Panel
        title="Entity Resolution"
        description="Raw references mapped to entities by WOIC. Unresolved references stay unresolved — no match is forced here."
      >
        <CapabilityState status={list.status} message={list.message} label="entity resolutions">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter references…">
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              aria-label="Filter by resolution status"
              className="h-8 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">All statuses</option>
              {RESOLUTION_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </ListControls>
          <RecordTable
            rows={paged}
            columns={[
              { key: "raw_reference", label: "Raw Reference", render: (r) => (
                <button type="button" className="text-left text-primary hover:underline" onClick={() => setSelected(r)}>
                  {str(r.raw_reference ?? r.reference ?? r.id, "(no reference)")}
                </button>
              ) },
              { key: "resolved_entity", label: "Resolved Entity", render: (r) =>
                r.resolved_entity == null
                  ? <span className="text-muted-foreground">unresolved</span>
                  : str(r.resolved_entity) },
              { key: "confidence", label: "Confidence", render: (r) => <ScoreMeter value={r.confidence} label="Confidence" /> },
              { key: "alternatives", label: "Alternatives", render: (r) => {
                const alts = asArray(r.alternative_matches ?? r.alternatives);
                return alts.length ? `${alts.length} candidate${alts.length === 1 ? "" : "s"}` : "—";
              } },
              { key: "source", label: "Source" },
              { key: "tenant", label: "Tenant", render: (r) => str(r.tenant ?? r.agency_id, "—") },
              { key: "status", label: "Status", render: (r) => <ResolutionBadge value={r.status} /> },
            ]}
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {selected && (
        <Panel title="Resolution Detail" description="Candidates as reported by WOIC — ambiguity remains visible.">
          <MetadataBlock value={selected} />
        </Panel>
      )}

      <PrivacyNotice />
    </div>
  );
}
