import { useState } from "react";
import { ListControls, MetadataBlock, Pager, Panel, RecordTable, usePagedRows } from "@/components/cognition/CogBits";
import {
  CapabilityState, FreshnessBadge, PrivacyNotice, RestrictedNotice, ScoreMeter,
} from "@/components/perception/PerceptionBits";
import { usePerceptionList, usePerceptionSettings, useRowFilter } from "@/hooks/perception/use-perception";
import { RELEVANCE_DECISIONS, str } from "@/lib/perception/platform";

export default function RelevanceView() {
  const [settings] = usePerceptionSettings();
  const [query, setQuery] = useState("");
  const [decision, setDecision] = useState("");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const list = usePerceptionList(
    "relevance.list",
    decision ? { decision } : {},
    { refetchInterval: settings.refreshMs },
  );
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);

  return (
    <div className="space-y-4">
      <Panel
        title="Relevance"
        description="Items WOIC considered for context, and whether they made it in. Scores are reported by 6.1A; nothing is re-ranked here."
      >
        <CapabilityState status={list.status} message={list.message} label="relevance decisions">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter candidates…">
            <select
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              aria-label="Filter by inclusion"
              className="h-8 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">Included and excluded</option>
              {RELEVANCE_DECISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </ListControls>
          <RecordTable
            rows={paged}
            columns={[
              { key: "item", label: "Item", render: (r) => (
                <button type="button" className="text-left text-primary hover:underline" onClick={() => setSelected(r)}>
                  {str(r.item ?? r.label ?? r.id, "(unnamed item)")}
                </button>
              ) },
              { key: "relevance_score", label: "Relevance", render: (r) => <ScoreMeter value={r.relevance_score ?? r.score} label="Relevance" /> },
              { key: "decision", label: "Decision", render: (r) => {
                const d = str(r.decision ?? (r.included === true ? "included" : r.included === false ? "excluded" : ""));
                if (!d) return <span className="text-muted-foreground">—</span>;
                return (
                  <span className={d === "included"
                    ? "rounded border border-emerald-500/50 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400"
                    : "rounded border border-slate-500/50 bg-slate-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300"}>
                    {d.toUpperCase()}
                  </span>
                );
              } },
              { key: "reason_category", label: "Reason Category", render: (r) => str(r.reason_category ?? r.reason, "—") },
              { key: "freshness", label: "Freshness", render: (r) => <FreshnessBadge value={r.freshness} /> },
              { key: "permission_status", label: "Permission", render: (r) =>
                r.permission_restricted ? <RestrictedNotice /> : str(r.permission_status, "—") },
              { key: "source_reliability", label: "Source Reliability", render: (r) => <ScoreMeter value={r.source_reliability} label="Reliability" /> },
            ]}
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {selected && (
        <Panel
          title="Inclusion Rationale"
          description="Reason categories reported by WOIC. Private chain-of-thought is never exposed."
        >
          <MetadataBlock value={selected} />
        </Panel>
      )}

      <PrivacyNotice />
    </div>
  );
}
