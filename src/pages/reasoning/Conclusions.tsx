import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  CapabilityState, ConclusionStatusBadge, ConfidenceMeter, InsufficientEvidenceState, ListControls,
  MetadataBlock, ModeChips, Pager, Panel, RecordTable, StanceBadge, UncertaintyNote, usePagedRows,
} from "@/components/reasoning/ReasonBits";
import {
  useReasoningAction, useReasoningCapability, useReasoningList, useReasoningPermissions,
  useReasoningSettings, useRowFilter,
} from "@/hooks/reasoning/use-reasoning";
import { asArray, asRecord, normalizeConclusion, str } from "@/lib/reasoning/platform";

export default function Conclusions() {
  const [settings] = useReasoningSettings();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const perms = useReasoningPermissions();

  const list = useReasoningList("reasoning.conclusions.list", {}, { refetchInterval: settings.refreshMs });
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);

  const detail = useReasoningCapability<Record<string, unknown>>(
    "reasoning.conclusions.get", { conclusion_id: selected }, { enabled: !!selected },
  );
  const rec = asRecord(detail.data);
  const status = normalizeConclusion(rec.status);
  const critique = useReasoningAction("reasoning.critique.request");

  return (
    <div className="space-y-4">
      <Panel title="Conclusions" description="Conclusions reported by WOIC. Nothing here is derived in the browser.">
        <CapabilityState status={list.status} message={list.message} label="conclusions">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter conclusions…" />
          <RecordTable
            rows={paged}
            empty="The Reasoning API returned no conclusions."
            columns={[
              { key: "conclusion", label: "Conclusion", render: (r) => (
                <button type="button" className="text-left text-primary hover:underline" onClick={() => setSelected(str(r.id ?? r.conclusion_id))}>
                  {str(r.conclusion ?? r.statement ?? r.id, "—")}
                </button>
              ) },
              { key: "status", label: "Status", render: (r) => <ConclusionStatusBadge value={r.status} /> },
              { key: "mode", label: "Mode", render: (r) => <ModeChips value={r.reasoning_mode ?? r.modes} /> },
              { key: "confidence", label: "Confidence", render: (r) => <ConfidenceMeter value={r.confidence} /> },
              { key: "contradicting_count", label: "Contradicting", render: (r) => (
                r.contradicting_count == null ? <span className="text-muted-foreground">—</span>
                  : <span className={Number(r.contradicting_count) > 0 ? "font-semibold text-red-400" : ""}>{str(r.contradicting_count)}</span>
              ) },
              { key: "valid_until", label: "Validity" },
            ]}
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {selected && (
        <Panel
          title="Conclusion Inspector"
          description={`Conclusion ${selected}`}
          tone={status === "CONTESTED" ? "danger" : undefined}
          actions={
            <div className="flex items-center gap-2">
              {perms.canRequestCritique && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={critique.isPending}
                  onClick={() => critique.mutate({ conclusion_id: selected }, {
                    onSuccess: () => toast({ title: "Critical review requested", description: "WOIC will perform the review." }),
                    onError: (e) => toast({ title: "Request failed", description: String(e), variant: "destructive" }),
                  })}
                >
                  {critique.isPending ? "Requesting…" : "Request critical review"}
                </Button>
              )}
              <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => setSelected(null)}>Close</button>
            </div>
          }
        >
          <CapabilityState status={detail.status} message={detail.message} label="this conclusion">
            <div className="space-y-3">
              <div className="rounded border bg-muted/20 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Conclusion</p>
                <p className="mt-1 whitespace-pre-wrap text-sm font-medium">{str(rec.conclusion ?? rec.statement, "Not reported.")}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <ConclusionStatusBadge value={rec.status} />
                  <ModeChips value={rec.reasoning_mode ?? rec.modes} />
                  <ConfidenceMeter value={rec.confidence} />
                  {rec.valid_from != null || rec.valid_until != null ? (
                    <span className="text-xs text-muted-foreground">
                      Valid {str(rec.valid_from, "—")} → {str(rec.valid_until, "—")}
                    </span>
                  ) : null}
                </div>
              </div>

              {status === "INSUFFICIENT_EVIDENCE" && (
                <InsufficientEvidenceState
                  cannotConclude={rec.cannot_conclude ?? rec.conclusion}
                  missing={rec.missing_evidence}
                  why={rec.insufficiency_reason}
                  sources={rec.suggested_sources}
                  impact={rec.decision_impact}
                />
              )}

              {rec.uncertainty != null && <UncertaintyNote>{str(rec.uncertainty)}</UncertaintyNote>}

              <div className="grid gap-3 md:grid-cols-2">
                <EvidencePanel title="Supporting evidence" stance="SUPPORTS" rows={asArray(rec.supporting_evidence)} />
                <EvidencePanel title="Contradicting evidence" stance="CONTRADICTS" rows={asArray(rec.contradicting_evidence)} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Block label="Supporting claims" value={rec.supporting_claims ?? rec.claims} />
                <Block label="Assumptions" value={rec.assumptions} />
                <Block label="Alternatives" value={rec.alternatives} />
                <Block label="History" value={rec.history} />
              </div>
            </div>
          </CapabilityState>
        </Panel>
      )}
    </div>
  );
}

function EvidencePanel({ title, stance, rows }: { title: string; stance: string; rows: Record<string, unknown>[] }) {
  return (
    <div className={`rounded border p-2 ${stance === "CONTRADICTS" ? "border-red-500/40" : ""}`}>
      <p className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
        {title} <StanceBadge value={stance} />
      </p>
      {rows.length === 0
        ? <p className="text-sm text-muted-foreground">None reported.</p>
        : (
          <ul className="space-y-1">
            {rows.map((e, i) => (
              <li key={i} className="rounded border bg-muted/20 px-2 py-1 text-sm">
                <p>{str(e.summary ?? e.statement ?? e.label ?? e.id, "—")}</p>
                <p className="text-[10px] text-muted-foreground">
                  Source: {str(e.source, "unreported")} · Freshness: {str(e.freshness, "unreported")} · Reliability: {str(e.reliability, "unreported")}
                </p>
              </li>
            ))}
          </ul>
        )}
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
