import { useState } from "react";
import {
  CapabilityState, ConfidenceMeter, ListControls, MetadataBlock, Pager, Panel,
  PrivacyNotice, RecordTable, RequestStateBadge, RiskBadge, usePagedRows,
} from "@/components/cognition/CogBits";
import { useCognitiveList, useCognitionSettings, useRowFilter } from "@/hooks/cognition/use-cognition";
import { asArray, asRecord, formatCost, str } from "@/lib/cognition/platform";

/**
 * A CognitiveSession is an objective under active work — not a chat thread.
 * It is rendered as an operations record: objective, work, evidence, budget.
 */
export default function ActiveSessions() {
  const [settings] = useCognitionSettings();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const list = useCognitiveList("sessions.list", {}, { refetchInterval: settings.refreshMs });
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);

  const detail = asRecord(selected);

  return (
    <div className="space-y-4">
      <Panel title="Active Cognitive Sessions" description="Objectives WOIC is currently working, with budget and risk.">
        <CapabilityState status={list.status} message={list.message} label="active cognitive sessions">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter sessions…" />
          <RecordTable
            rows={paged}
            columns={[
              { key: "objective", label: "Objective", render: (r) => (
                <button type="button" className="text-left text-primary hover:underline" onClick={() => setSelected(r)}>
                  {str(r.objective ?? r.title, "(no objective reported)")}
                </button>
              ) },
              { key: "status", label: "Status", render: (r) => <RequestStateBadge state={r.status} /> },
              { key: "risk", label: "Risk", render: (r) => <RiskBadge risk={r.risk} /> },
              { key: "requests", label: "Requests", render: (r) => str(r.request_count ?? asArray(r.requests).length, "—") },
              { key: "open_questions", label: "Open Questions", render: (r) => str(r.open_question_count ?? asArray(r.open_questions).length, "—") },
              { key: "confidence", label: "Confidence", render: (r) => <ConfidenceMeter value={r.confidence} /> },
              { key: "budget", label: "Budget", render: (r) => formatCost(asRecord(r.budget).estimated_cost ?? r.cost) },
            ]}
            empty="No cognitive session is currently open for this organization."
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {selected && (
        <Panel title="Session Detail" description="Objective, work in progress, evidence, claims and pending questions.">
          <div className="grid gap-3 lg:grid-cols-2">
            {[
              ["Objective", detail.objective],
              ["Status", detail.status],
              ["Risk", detail.risk],
              ["Requests", detail.requests],
              ["Faculty Activity", detail.faculty_activity],
              ["Evidence", detail.evidence],
              ["Claims", detail.claims],
              ["Open Questions", detail.open_questions],
              ["Pending Work", detail.pending_work],
              ["Budget", detail.budget],
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
