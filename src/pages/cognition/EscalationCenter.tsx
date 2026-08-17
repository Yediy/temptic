import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  CapabilityState, ConfidenceMeter, ListControls, MetadataBlock, Pager, Panel,
  PrivacyNotice, RecordTable, RiskBadge, usePagedRows,
} from "@/components/cognition/CogBits";
import {
  useCognitiveList, useCognitiveMutation, useCognitionPermissions,
  useCognitionSettings, useRowFilter,
} from "@/hooks/cognition/use-cognition";
import { ESCALATION_REASONS, asRecord, escalationReasonLabel, str } from "@/lib/cognition/platform";

export default function EscalationCenter() {
  const [settings] = useCognitionSettings();
  const { can } = useCognitionPermissions();
  const [query, setQuery] = useState("");
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [note, setNote] = useState("");

  const list = useCognitiveList("escalations.list", reason ? { reason } : {}, { refetchInterval: settings.refreshMs });
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);
  const acknowledge = useCognitiveMutation("escalations.acknowledge");
  const detail = asRecord(selected);

  return (
    <div className="space-y-4">
      <Panel
        title="Escalation Center"
        description="Cognitive operations that require human judgement before they can proceed."
        tone="warn"
      >
        <CapabilityState status={list.status} message={list.message} label="cognitive escalations">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter escalations…">
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              aria-label="Filter by escalation reason"
              className="h-8 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">All reasons</option>
              {ESCALATION_REASONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </ListControls>
          <RecordTable
            rows={paged}
            columns={[
              { key: "reason", label: "Reason", render: (r) => escalationReasonLabel(r.reason) },
              { key: "objective", label: "Operation", render: (r) => (
                <button type="button" className="max-w-md text-left text-primary hover:underline" onClick={() => setSelected(r)}>
                  {str(r.objective ?? r.summary ?? r.request_id, "—")}
                </button>
              ) },
              { key: "risk", label: "Risk", render: (r) => <RiskBadge risk={r.risk} /> },
              { key: "confidence", label: "Confidence", render: (r) => <ConfidenceMeter value={r.confidence} /> },
              { key: "raised_at", label: "Raised" },
              { key: "status", label: "Status" },
            ]}
            empty="No cognitive operation is currently waiting on a human."
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {selected && (
        <Panel
          title="Escalation Detail"
          description={ESCALATION_REASONS.find((r) => r.key === str(detail.reason))?.detail}
          actions={<Button type="button" size="sm" variant="ghost" onClick={() => setSelected(null)}>Close</Button>}
        >
          <MetadataBlock value={detail} />
          {can("escalations.acknowledge") && (
            <div className="mt-3 space-y-2 border-t pt-3">
              <label className="text-xs font-medium" htmlFor="ack-note">Acknowledgement note (recorded by the Cognitive Core)</label>
              <Textarea id="ack-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="What decision or additional information resolves this escalation?" />
              <Button
                type="button"
                size="sm"
                disabled={!note.trim() || acknowledge.isPending}
                onClick={async () => {
                  try {
                    await acknowledge.mutateAsync({ escalation_id: detail.id, note: note.trim() });
                    toast.success("Acknowledgement recorded by the Cognitive Core.");
                    setNote(""); setSelected(null);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "The Cognitive Control API rejected the acknowledgement.");
                  }
                }}
              >
                {acknowledge.isPending ? "Recording…" : "Acknowledge escalation"}
              </Button>
              <p className="text-[11px] text-muted-foreground">
                The acknowledgement is executed by the Cognitive Core under your identity; this workspace does not
                resolve escalations itself.
              </p>
            </div>
          )}
        </Panel>
      )}

      <PrivacyNotice />
    </div>
  );
}
