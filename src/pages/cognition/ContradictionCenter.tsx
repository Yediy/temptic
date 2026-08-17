import { useState } from "react";
import {
  CapabilityState, ListControls, MetadataBlock, Pager, Panel, PrivacyNotice,
  RecordTable, UncertaintyFlag, usePagedRows,
} from "@/components/cognition/CogBits";
import { useCognitiveList, useCognitionSettings, useRowFilter } from "@/hooks/cognition/use-cognition";
import { asRecord, str } from "@/lib/cognition/platform";

export default function ContradictionCenter() {
  const [settings] = useCognitionSettings();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const list = useCognitiveList("contradictions.list", {}, { refetchInterval: settings.refreshMs });
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);
  const detail = asRecord(selected);

  return (
    <div className="space-y-4">
      <Panel
        title="Contradiction Center"
        description="Conflicting evidence and claims WOIC could not reconcile."
        tone="warn"
      >
        <CapabilityState status={list.status} message={list.message} label="cognitive contradictions">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter contradictions…" />
          <RecordTable
            rows={paged}
            columns={[
              { key: "conflict", label: "Conflict", render: (r) => (
                <button type="button" className="max-w-md text-left text-primary hover:underline" onClick={() => setSelected(r)}>
                  {str(r.conflict ?? r.summary ?? r.id, "—")}
                </button>
              ) },
              { key: "sources", label: "Sources", render: (r) => str(r.sources, "—") },
              { key: "affected_claims", label: "Affected Claims", render: (r) => str(r.affected_claims, "—") },
              { key: "confidence_impact", label: "Confidence Impact", render: (r) => (
                r.confidence_impact == null ? <span className="text-muted-foreground">—</span>
                  : <UncertaintyFlag>{str(r.confidence_impact)}</UncertaintyFlag>
              ) },
              { key: "woic_status", label: "WOIC Status", render: (r) => str(r.woic_status ?? r.status, "—") },
              { key: "required_review", label: "Required Review", render: (r) => str(r.required_review, "—") },
            ]}
            empty="No contradictions have been reported by the Cognitive Core."
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {selected && (
        <Panel title="Contradiction Detail" description="Conflicting sources and the resolution record.">
          <div className="grid gap-3 lg:grid-cols-2">
            {[
              ["Conflict", detail.conflict ?? detail.summary],
              ["Sources", detail.sources],
              ["Affected Claims", detail.affected_claims],
              ["Confidence Impact", detail.confidence_impact],
              ["WOIC Status", detail.woic_status ?? detail.status],
              ["Required Review", detail.required_review],
              ["Resolution History", detail.resolution_history],
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
