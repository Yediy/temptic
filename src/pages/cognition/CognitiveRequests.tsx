import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CapabilityState, CognitiveFlow, ConfidenceMeter, ListControls, MetadataBlock, Pager, Panel,
  PrivacyNotice, RecordTable, RequestStateBadge, RiskBadge, UncertaintyFlag, usePagedRows,
} from "@/components/cognition/CogBits";
import { useCognitiveCapability, useCognitiveList, useCognitionSettings, useRowFilter } from "@/hooks/cognition/use-cognition";
import {
  REQUEST_SECTIONS, REQUEST_STATES, asArray, asRecord, formatCost, formatLatency, str,
} from "@/lib/cognition/platform";

export default function CognitiveRequests() {
  const [settings] = useCognitionSettings();
  const [query, setQuery] = useState("");
  const [state, setState] = useState<string>("");
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useCognitiveList(
    "requests.list",
    state ? { status: state } : {},
    { refetchInterval: settings.refreshMs },
  );
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);

  const detail = useCognitiveCapability<Record<string, unknown>>(
    "requests.get", { request_id: openId }, { enabled: !!openId },
  );
  const flow = useCognitiveCapability<Record<string, unknown>>(
    "requests.flow", { request_id: openId }, { enabled: !!openId },
  );
  const record = asRecord(detail.data);

  return (
    <div className="space-y-4">
      <Panel title="Cognitive Requests" description="Every cognitive operation, why it exists and what it produced.">
        <CapabilityState status={list.status} message={list.message} label="cognitive requests">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter requests…">
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              aria-label="Filter by status"
              className="h-8 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">All statuses</option>
              {REQUEST_STATES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
          </ListControls>
          <RecordTable
            rows={paged}
            columns={[
              { key: "objective", label: "Objective", render: (r) => (
                <button type="button" className="text-left text-primary hover:underline" onClick={() => setOpenId(str(r.id))}>
                  {str(r.objective ?? r.question ?? r.id, "(no objective reported)")}
                </button>
              ) },
              { key: "domain", label: "Domain" },
              { key: "initiator", label: "Initiator", render: (r) => str(r.initiator ?? r.initiated_by, "—") },
              { key: "status", label: "Status", render: (r) => <RequestStateBadge state={r.status} /> },
              { key: "risk", label: "Risk", render: (r) => <RiskBadge risk={r.risk} /> },
              { key: "confidence", label: "Confidence", render: (r) => <ConfidenceMeter value={r.confidence} /> },
              { key: "latency", label: "Latency", render: (r) => formatLatency(r.latency_ms ?? r.latency) },
              { key: "cost", label: "Cost", render: (r) => formatCost(r.cost) },
            ]}
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {openId && (
        <Panel
          title="Cognitive Request Inspector"
          description="Operational metadata for the selected request."
          actions={<Button type="button" size="sm" variant="ghost" onClick={() => setOpenId(null)}>Close</Button>}
        >
          <CapabilityState status={detail.status} message={detail.message} label="this cognitive request">
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Cognitive Flow</p>
                <CognitiveFlow stages={asArray(asRecord(flow.data).stages ?? flow.data)} />
                {flow.status === "pending" && (
                  <p className="mt-1 text-[11px] text-amber-400">BACKEND CAPABILITY PENDING — flow metadata not served.</p>
                )}
              </div>

              {asArray(record.uncertainty).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {asArray(record.uncertainty).map((u, i) => (
                    <UncertaintyFlag key={i}>{str(u.kind ?? u.label ?? u.detail, "uncertainty")}</UncertaintyFlag>
                  ))}
                </div>
              )}

              <div className="grid gap-3 lg:grid-cols-2">
                {REQUEST_SECTIONS.map((s) => (
                  <div key={s.key}>
                    <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
                    {s.key === "confidence"
                      ? <ConfidenceMeter value={record.confidence} />
                      : <MetadataBlock value={record[s.key]} />}
                  </div>
                ))}
              </div>
            </div>
          </CapabilityState>
        </Panel>
      )}

      <PrivacyNotice />
    </div>
  );
}
