import { useState } from "react";
import { Link } from "react-router-dom";
import {
  CapabilityState, ConfidenceMeter, CoverageMeter, InsufficientEvidenceState, ListControls, MetadataBlock,
  ModeChips, Pager, Panel, RecordTable, RequestStateBadge, UncertaintyNote, usePagedRows,
} from "@/components/reasoning/ReasonBits";
import {
  useReasoningCapability, useReasoningList, useReasoningSettings, useRowFilter,
} from "@/hooks/reasoning/use-reasoning";
import { asRecord, normalizeRequestState, str } from "@/lib/reasoning/platform";

export default function ActiveReasoning() {
  const [settings] = useReasoningSettings();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const list = useReasoningList("reasoning.requests.list", {}, { refetchInterval: settings.refreshMs });
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);

  const detail = useReasoningCapability<Record<string, unknown>>(
    "reasoning.requests.get", { request_id: selected }, { enabled: !!selected },
  );
  const rec = asRecord(detail.data);
  const insufficient = normalizeRequestState(rec.status ?? rec.state) === "INSUFFICIENT_EVIDENCE";

  return (
    <div className="space-y-4">
      <Panel title="Reasoning Requests" description="Requests reported by the Phase 6.3A Reasoning API.">
        <CapabilityState status={list.status} message={list.message} label="reasoning requests">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter by objective, status, mode…" />
          <RecordTable
            rows={paged}
            empty="The Reasoning API returned no requests."
            columns={[
              { key: "objective", label: "Objective", render: (r) => (
                <button type="button" className="text-left text-primary hover:underline" onClick={() => setSelected(str(r.id ?? r.request_id))}>
                  {str(r.objective ?? r.question ?? r.request ?? r.id, "—")}
                </button>
              ) },
              { key: "status", label: "Status", render: (r) => <RequestStateBadge value={r.status ?? r.state} /> },
              { key: "modes", label: "Reasoning Modes", render: (r) => <ModeChips value={r.reasoning_modes ?? r.modes} /> },
              { key: "confidence", label: "Confidence", render: (r) => <ConfidenceMeter value={r.confidence} /> },
              { key: "coverage", label: "Coverage", render: (r) => <CoverageMeter value={r.evidence_coverage} /> },
              { key: "created_at", label: "Created" },
            ]}
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {selected && (
        <Panel
          title="Reasoning Request"
          description={`Request ${selected}`}
          actions={<button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => setSelected(null)}>Close</button>}
        >
          <CapabilityState status={detail.status} message={detail.message} label="this reasoning request">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Field label="Objective" value={rec.objective ?? rec.question} />
                <Field label="Request" value={rec.request ?? rec.input} />
                <div className="rounded border bg-muted/20 px-2 py-1.5">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Status</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <RequestStateBadge value={rec.status ?? rec.state} />
                    <ModeChips value={rec.reasoning_modes ?? rec.modes} />
                  </div>
                </div>
                <div className="rounded border bg-muted/20 px-2 py-1.5">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Confidence &amp; coverage</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <ConfidenceMeter value={rec.confidence} />
                    <CoverageMeter value={rec.evidence_coverage} />
                  </div>
                </div>
                {rec.working_memory_ref != null && (
                  <p className="text-xs">
                    Working memory:{" "}
                    <Link className="text-primary hover:underline" to="/memory/state">{str(rec.working_memory_ref)}</Link>
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Block label="Context" value={rec.context} />
                <Block label="Constraints" value={rec.constraints} />
                <Block label="Assumptions" value={rec.assumptions} />
                <Block label="Model metadata" value={rec.model_metadata ?? rec.model} />
              </div>
            </div>

            {insufficient && (
              <div className="mt-3">
                <InsufficientEvidenceState
                  cannotConclude={rec.cannot_conclude}
                  missing={rec.missing_evidence}
                  why={rec.insufficiency_reason}
                  sources={rec.suggested_sources}
                  impact={rec.decision_impact}
                />
              </div>
            )}

            {rec.uncertainty != null && (
              <div className="mt-3"><UncertaintyNote>{str(rec.uncertainty)}</UncertaintyNote></div>
            )}

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Block label="Evidence" value={rec.evidence} />
              <Block label="Claims" value={rec.claims} />
              <Block label="Conclusions" value={rec.conclusions} />
              <Block label="Hypotheses" value={rec.hypotheses} />
              <Block label="Alternatives" value={rec.alternatives} />
              <Block label="Critical review" value={rec.critical_review ?? rec.critique} />
              <Block label="Simulation references" value={rec.simulation_refs ?? rec.simulations} />
              <Block label="Decision references" value={rec.decision_refs ?? rec.decisions} />
            </div>
          </CapabilityState>
        </Panel>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded border bg-muted/20 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap text-sm">{value == null ? "Not reported." : str(value)}</p>
    </div>
  );
}

function Block({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded border p-2">
      <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <MetadataBlock value={value} />
    </div>
  );
}
