import { useState } from "react";
import {
  CapabilityState, ConfidenceMeter, ListControls, MetadataBlock, Pager, Panel,
  PrivacyNotice, RecordTable, UncertaintyFlag, usePagedRows,
} from "@/components/cognition/CogBits";
import { useCognitiveList, useCognitionSettings, useRowFilter } from "@/hooks/cognition/use-cognition";
import { asRecord, str } from "@/lib/cognition/platform";

export default function EvidenceExplorer() {
  const [settings] = useCognitionSettings();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const list = useCognitiveList("evidence.list", {}, { refetchInterval: settings.refreshMs });
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);
  const detail = asRecord(selected);

  return (
    <div className="space-y-4">
      <Panel
        title="Evidence Explorer"
        description="Trace every conclusion back to the evidence that supports it."
      >
        <CapabilityState status={list.status} message={list.message} label="cognitive evidence">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter evidence…" />
          <RecordTable
            rows={paged}
            columns={[
              { key: "summary", label: "Evidence", render: (r) => (
                <button type="button" className="text-left text-primary hover:underline" onClick={() => setSelected(r)}>
                  {str(r.summary ?? r.statement ?? r.id, "—")}
                </button>
              ) },
              { key: "source", label: "Source" },
              { key: "provenance", label: "Provenance", render: (r) => str(r.provenance, "—") },
              { key: "freshness", label: "Freshness", render: (r) => (
                str(r.freshness).toLowerCase() === "stale"
                  ? <UncertaintyFlag>STALE</UncertaintyFlag>
                  : str(r.freshness, "—")
              ) },
              { key: "reliability", label: "Reliability", render: (r) => <ConfidenceMeter value={r.reliability} label="Reliability" /> },
              { key: "claim_supported", label: "Claim Supported", render: (r) => str(r.claim_supported ?? r.claim_id, "—") },
              { key: "contradictions", label: "Contradictions", render: (r) => (
                Number(r.contradiction_count ?? 0) > 0
                  ? <UncertaintyFlag>{str(r.contradiction_count)} conflict(s)</UncertaintyFlag>
                  : <span className="text-muted-foreground">none</span>
              ) },
              { key: "permission_scope", label: "Permission Scope" },
              { key: "confidence_contribution", label: "Confidence Contribution", render: (r) => <ConfidenceMeter value={r.confidence_contribution} /> },
            ]}
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {selected && (
        <Panel title="Evidence Detail" description="Provenance chain and downstream use.">
          <div className="grid gap-3 lg:grid-cols-2">
            {[
              ["Statement", detail.summary ?? detail.statement],
              ["Source", detail.source],
              ["Provenance", detail.provenance],
              ["Collected At", detail.collected_at],
              ["Freshness", detail.freshness],
              ["Reliability", detail.reliability],
              ["Claims Supported", detail.claims_supported ?? detail.claim_supported],
              ["Contradictions", detail.contradictions],
              ["Permission Scope", detail.permission_scope],
              ["Used By Requests", detail.used_by_requests],
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
