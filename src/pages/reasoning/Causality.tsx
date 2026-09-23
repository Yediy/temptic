import { useState } from "react";
import {
  CapabilityState, CausalBadge, ConfidenceMeter, ListControls, MetadataBlock, Pager, Panel, RecordTable,
  usePagedRows,
} from "@/components/reasoning/ReasonBits";
import { useReasoningList, useReasoningSettings, useRowFilter } from "@/hooks/reasoning/use-reasoning";
import { CAUSAL_CLASSES, CAUSAL_MEANING, str } from "@/lib/reasoning/platform";

export default function Causality() {
  const [settings] = useReasoningSettings();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const list = useReasoningList("reasoning.causality.list", {}, { refetchInterval: settings.refreshMs });
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);
  const detail = filtered.find((r) => str(r.id ?? r.claim_id) === open);

  return (
    <div className="space-y-4">
      <Panel title="Causal Classification Legend" description="Classification is assigned by WOIC (6.3A). This workspace never infers causality.">
        <ul className="grid gap-2 sm:grid-cols-2">
          {CAUSAL_CLASSES.map((c) => (
            <li key={c} className="flex items-start gap-2 rounded border p-2 text-xs">
              <CausalBadge value={c} />
              <span className="text-muted-foreground">{CAUSAL_MEANING[c]}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Causal Claims" description="Every claim carries its classification and the evidence behind it.">
        <CapabilityState status={list.status} message={list.message} label="causal claims">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter causal claims…" />
          <RecordTable
            rows={paged}
            empty="The Reasoning API returned no causal claims."
            columns={[
              { key: "claim", label: "Claim", render: (r) => (
                <button type="button" className="text-left text-primary hover:underline" onClick={() => setOpen(str(r.id ?? r.claim_id))}>
                  {str(r.claim ?? r.statement ?? r.id, "—")}
                </button>
              ) },
              { key: "classification", label: "Classification", render: (r) => <CausalBadge value={r.classification ?? r.causal_class} /> },
              { key: "confidence", label: "Confidence", render: (r) => <ConfidenceMeter value={r.confidence} /> },
              { key: "method", label: "Method" },
              { key: "updated_at", label: "Updated" },
            ]}
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {open && detail && (
        <Panel
          title="Causal Claim"
          description={str(detail.claim ?? detail.statement, "")}
          actions={<button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => setOpen(null)}>Close</button>}
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <CausalBadge value={detail.classification ?? detail.causal_class} />
              <ConfidenceMeter value={detail.confidence} />
              <span className="text-xs text-muted-foreground">Method: {str(detail.method, "unreported")}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded border p-2">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Evidence for the classification</p>
                <MetadataBlock value={detail.evidence} />
              </div>
              <div className="rounded border p-2">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Confounders and caveats</p>
                <MetadataBlock value={detail.confounders ?? detail.caveats} />
              </div>
              <div className="rounded border p-2 md:col-span-2">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Affected conclusions</p>
                <MetadataBlock value={detail.conclusions ?? detail.affects} />
              </div>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
