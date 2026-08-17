import { useState } from "react";
import { ListControls, MetadataBlock, Pager, Panel, RecordTable, usePagedRows } from "@/components/cognition/CogBits";
import {
  CapabilityState, FreshnessBadge, PrivacyNotice, ScoreMeter, UnresolvedFlag,
} from "@/components/perception/PerceptionBits";
import { usePerceptionList, usePerceptionSettings, useRowFilter } from "@/hooks/perception/use-perception";
import { asRecord, str } from "@/lib/perception/platform";

function SourceSide({ side, label }: { side: unknown; label: string }) {
  const rec = asRecord(side);
  return (
    <div className="rounded-md border p-3">
      <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      {Object.keys(rec).length === 0
        ? <p className="text-sm text-muted-foreground">Not reported.</p>
        : (
          <div className="space-y-2">
            <p className="text-sm">{str(rec.claim ?? rec.observation ?? rec.summary, "—")}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">{str(rec.source, "unknown source")}</span>
              <ScoreMeter value={rec.reliability} label="Reliability" />
              <FreshnessBadge value={rec.freshness} />
            </div>
          </div>
        )}
    </div>
  );
}

export default function PerceptionContradictions() {
  const [settings] = usePerceptionSettings();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const list = usePerceptionList("contradictions.list", {}, { refetchInterval: settings.refreshMs });
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);
  const detail = asRecord(selected);

  return (
    <div className="space-y-4">
      <Panel
        title="Contradiction Center"
        description="Conflicting observations across sources. Unresolved conflicts are never presented as settled facts."
        tone="warn"
      >
        <CapabilityState status={list.status} message={list.message} label="observation contradictions">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter contradictions…" />
          <RecordTable
            rows={paged}
            columns={[
              { key: "conflict", label: "Conflict", render: (r) => (
                <button type="button" className="text-left text-primary hover:underline" onClick={() => setSelected(r)}>
                  {str(r.conflict ?? r.summary ?? r.id, "(unnamed conflict)")}
                </button>
              ) },
              { key: "source_a", label: "Source A", render: (r) => str(asRecord(r.source_a).source ?? r.source_a, "—") },
              { key: "source_b", label: "Source B", render: (r) => str(asRecord(r.source_b).source ?? r.source_b, "—") },
              { key: "claims_affected", label: "Claims Affected", render: (r) => str(r.claims_affected, "—") },
              { key: "status", label: "Status", render: (r) => {
                const s = str(r.status, "unresolved").toLowerCase();
                return s === "resolved" ? "RESOLVED" : <UnresolvedFlag>{s.toUpperCase()}</UnresolvedFlag>;
              } },
              { key: "human_review_required", label: "Human Review", render: (r) =>
                r.human_review_required ? <UnresolvedFlag>required</UnresolvedFlag> : str(r.human_review_required, "—") },
            ]}
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {selected && (
        <Panel title="Conflict Detail" description="Both sides shown side by side. Neither is promoted to fact." tone="warn">
          <div className="grid gap-3 lg:grid-cols-2">
            <SourceSide side={detail.source_a} label="Source A" />
            <SourceSide side={detail.source_b} label="Source B" />
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Claims Affected</p>
              <MetadataBlock value={detail.claims_affected} />
            </div>
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Evidence</p>
              <MetadataBlock value={detail.evidence} />
            </div>
          </div>
        </Panel>
      )}

      <PrivacyNotice />
    </div>
  );
}
