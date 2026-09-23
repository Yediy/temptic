import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  CapabilityState, CompareColumns, ConfidenceMeter, ListControls, MetadataBlock, Pager, Panel, RecordTable,
  ResolutionBadge, UncertaintyNote, usePagedRows,
} from "@/components/reasoning/ReasonBits";
import {
  useReasoningAction, useReasoningList, useReasoningPermissions, useReasoningSettings, useRowFilter,
} from "@/hooks/reasoning/use-reasoning";
import { str } from "@/lib/reasoning/platform";

export default function ModelDisagreement() {
  const [settings] = useReasoningSettings();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const perms = useReasoningPermissions();
  const escalate = useReasoningAction("reasoning.disagreement.escalate");

  const list = useReasoningList("reasoning.disagreements.list", {}, { refetchInterval: settings.refreshMs });
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);
  const detail = filtered.find((r) => str(r.id ?? r.disagreement_id) === open);

  return (
    <div className="space-y-4">
      <Panel
        title="Model Disagreement"
        tone="warn"
        description="Where faculties or models reached different conclusions. Disagreement is shown as disagreement — it is never averaged into one answer."
      >
        <CapabilityState status={list.status} message={list.message} label="model disagreements">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter disagreements…" />
          <RecordTable
            rows={paged}
            empty="The Reasoning API reported no model disagreements."
            columns={[
              { key: "subject", label: "Subject", render: (r) => (
                <button type="button" className="text-left text-primary hover:underline" onClick={() => setOpen(str(r.id ?? r.disagreement_id))}>
                  {str(r.subject ?? r.topic ?? r.id, "—")}
                </button>
              ) },
              { key: "parties", label: "Parties", render: (r) => <span className="text-xs">{str(r.parties ?? r.models, "unreported")}</span> },
              { key: "divergence", label: "Divergence" },
              { key: "status", label: "Resolution", render: (r) => <ResolutionBadge value={r.status ?? r.resolution_status} /> },
              { key: "detected_at", label: "Detected" },
            ]}
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {open && detail && (
        <Panel
          title="Disagreement"
          tone="warn"
          description={str(detail.subject ?? detail.topic, "")}
          actions={
            <div className="flex items-center gap-2">
              {perms.canHandoff && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={escalate.isPending}
                  onClick={() => escalate.mutate({ disagreement_id: open }, {
                    onSuccess: () => toast({ title: "Escalated", description: "WOIC recorded the escalation." }),
                    onError: (e) => toast({ title: "Escalation failed", description: String(e), variant: "destructive" }),
                  })}
                >
                  {escalate.isPending ? "Escalating…" : "Escalate to human review"}
                </Button>
              )}
              <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => setOpen(null)}>Close</button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <ResolutionBadge value={detail.status ?? detail.resolution_status} />
              <ConfidenceMeter value={detail.confidence_a} label="Position A confidence" />
              <ConfidenceMeter value={detail.confidence_b} label="Position B confidence" />
            </div>
            <CompareColumns
              leftLabel={str(detail.party_a ?? detail.model_a, "Position A")}
              rightLabel={str(detail.party_b ?? detail.model_b, "Position B")}
              left={<MetadataBlock value={detail.position_a} />}
              right={<MetadataBlock value={detail.position_b} />}
            />
            <UncertaintyNote>
              {str(detail.impact ?? detail.reasoning_impact, "WOIC has not reported how this disagreement affects downstream decisions.")}
            </UncertaintyNote>
            <div className="rounded border p-2">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Resolution path reported by WOIC</p>
              <MetadataBlock value={detail.resolution_path ?? detail.resolution} />
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
