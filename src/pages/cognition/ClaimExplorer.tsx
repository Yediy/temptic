import { useState } from "react";
import {
  CapabilityState, ClaimStateBadge, ConfidenceMeter, ListControls, MetadataBlock,
  Pager, Panel, PrivacyNotice, RecordTable, usePagedRows,
} from "@/components/cognition/CogBits";
import { useCognitiveList, useCognitionSettings, useRowFilter } from "@/hooks/cognition/use-cognition";
import { CLAIM_STATES, asRecord, str } from "@/lib/cognition/platform";

export default function ClaimExplorer() {
  const [settings] = useCognitionSettings();
  const [query, setQuery] = useState("");
  const [state, setState] = useState("");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const list = useCognitiveList("claims.list", state ? { status: state } : {}, { refetchInterval: settings.refreshMs });
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);
  const detail = asRecord(selected);

  return (
    <div className="space-y-4">
      <Panel title="Claims" description="Structured claims produced by WOIC, with their support and validity.">
        <CapabilityState status={list.status} message={list.message} label="cognitive claims">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter claims…">
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              aria-label="Filter by claim state"
              className="h-8 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">All states</option>
              {CLAIM_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </ListControls>
          <RecordTable
            rows={paged}
            columns={[
              { key: "statement", label: "Statement", render: (r) => (
                <button type="button" className="max-w-md text-left text-primary hover:underline" onClick={() => setSelected(r)}>
                  {str(r.statement ?? r.id, "—")}
                </button>
              ) },
              { key: "status", label: "State", render: (r) => <ClaimStateBadge state={r.status ?? r.state} /> },
              { key: "evidence_for", label: "Evidence For", render: (r) => str(r.evidence_for_count ?? r.evidence_for, "—") },
              { key: "evidence_against", label: "Evidence Against", render: (r) => str(r.evidence_against_count ?? r.evidence_against, "—") },
              { key: "confidence", label: "Confidence", render: (r) => <ConfidenceMeter value={r.confidence} /> },
              { key: "source_faculty", label: "Source Faculty" },
              { key: "validity", label: "Validity", render: (r) => str(r.validity ?? r.valid_until, "—") },
            ]}
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {selected && (
        <Panel title="Claim Detail" description="Support, opposition, assumptions and state history.">
          <div className="grid gap-3 lg:grid-cols-2">
            {[
              ["Statement", detail.statement],
              ["State", detail.status ?? detail.state],
              ["Evidence For", detail.evidence_for],
              ["Evidence Against", detail.evidence_against],
              ["Assumptions", detail.assumptions],
              ["Source Faculty", detail.source_faculty],
              ["Validity", detail.validity],
              ["History", detail.history],
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
