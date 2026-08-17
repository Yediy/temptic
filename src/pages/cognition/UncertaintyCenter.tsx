import { useState } from "react";
import {
  CapabilityState, ListControls, MetadataBlock, Pager, Panel, PrivacyNotice,
  RecordTable, UncertaintyFlag, usePagedRows,
} from "@/components/cognition/CogBits";
import { useCognitiveList, useCognitionSettings, useRowFilter } from "@/hooks/cognition/use-cognition";
import { UNCERTAINTY_KINDS, asRecord, str, uncertaintyLabel } from "@/lib/cognition/platform";

export default function UncertaintyCenter() {
  const [settings] = useCognitionSettings();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const list = useCognitiveList("uncertainty.list", kind ? { kind } : {}, { refetchInterval: settings.refreshMs });
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);
  const detail = asRecord(selected);

  const counts = UNCERTAINTY_KINDS.map((k) => ({
    ...k,
    count: list.rows.filter((r) => str(r.kind) === k.key).length,
  }));

  return (
    <div className="space-y-4">
      <Panel
        title="Uncertainty Center"
        description="What WOIC does not know. Absent information is shown as absent — never as a precise score."
        tone="warn"
      >
        <CapabilityState status={list.status} message={list.message} label="declared cognitive uncertainty">
          <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {counts.map((c) => (
              <div key={c.key} className="rounded-md border border-amber-500/30 bg-amber-500/[0.04] p-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{c.label}</p>
                <p className="text-lg font-bold tabular-nums text-amber-400">{c.count}</p>
                <p className="text-[11px] text-muted-foreground">{c.detail}</p>
              </div>
            ))}
          </div>

          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter uncertainty…">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              aria-label="Filter by uncertainty kind"
              className="h-8 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">All kinds</option>
              {UNCERTAINTY_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
            </select>
          </ListControls>

          <RecordTable
            rows={paged}
            columns={[
              { key: "kind", label: "Kind", render: (r) => <UncertaintyFlag>{uncertaintyLabel(r.kind)}</UncertaintyFlag> },
              { key: "detail", label: "Detail", render: (r) => (
                <button type="button" className="max-w-md text-left text-primary hover:underline" onClick={() => setSelected(r)}>
                  {str(r.detail ?? r.summary ?? r.id, "—")}
                </button>
              ) },
              { key: "subject", label: "Subject", render: (r) => str(r.subject ?? r.request_id, "—") },
              { key: "impact", label: "Impact", render: (r) => str(r.impact, "—") },
              { key: "resolution", label: "How to Resolve", render: (r) => str(r.resolution ?? r.required_input, "—") },
            ]}
            empty="No uncertainty has been declared by the Cognitive Core."
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {selected && (
        <Panel title="Uncertainty Detail">
          <MetadataBlock value={detail} />
        </Panel>
      )}

      <PrivacyNotice />
    </div>
  );
}
