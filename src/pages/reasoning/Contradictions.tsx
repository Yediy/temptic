import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  CapabilityState, CompareColumns, ListControls, MetadataBlock, Pager, Panel, RecordTable, ResolutionBadge,
  UncertaintyNote, usePagedRows,
} from "@/components/reasoning/ReasonBits";
import {
  useReasoningAction, useReasoningList, useReasoningPermissions, useReasoningSettings, useRowFilter,
} from "@/hooks/reasoning/use-reasoning";
import { str } from "@/lib/reasoning/platform";

export default function Contradictions() {
  const [settings] = useReasoningSettings();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const perms = useReasoningPermissions();
  const review = useReasoningAction("reasoning.contradiction.review");

  const list = useReasoningList("reasoning.contradictions.list", {}, { refetchInterval: settings.refreshMs });
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);
  const detail = filtered.find((r) => str(r.id ?? r.contradiction_id) === open);

  return (
    <div className="space-y-4">
      <Panel title="Contradictions" tone="danger" description="Conflicting evidence and claims stay visible until WOIC resolves them. Unresolved conflict is never collapsed into a single answer here.">
        <CapabilityState status={list.status} message={list.message} label="contradictions">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter contradictions…" />
          <RecordTable
            rows={paged}
            empty="The Reasoning API reported no contradictions."
            columns={[
              { key: "subject", label: "Subject", render: (r) => (
                <button type="button" className="text-left text-primary hover:underline" onClick={() => setOpen(str(r.id ?? r.contradiction_id))}>
                  {str(r.subject ?? r.topic ?? r.summary ?? r.id, "—")}
                </button>
              ) },
              { key: "type", label: "Type" },
              { key: "severity", label: "Severity" },
              { key: "status", label: "Resolution", render: (r) => <ResolutionBadge value={r.status ?? r.resolution_status} /> },
              { key: "detected_at", label: "Detected" },
            ]}
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {open && detail && (
        <Panel
          title="Contradiction"
          tone="danger"
          description={str(detail.subject ?? detail.topic, "")}
          actions={
            <div className="flex items-center gap-2">
              {perms.canResolveContradiction && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={review.isPending}
                  onClick={() => review.mutate({ contradiction_id: open }, {
                    onSuccess: () => toast({ title: "Sent for human review", description: "WOIC recorded the review request." }),
                    onError: (e) => toast({ title: "Request failed", description: String(e), variant: "destructive" }),
                  })}
                >
                  {review.isPending ? "Sending…" : "Request human review"}
                </Button>
              )}
              <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => setOpen(null)}>Close</button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <ResolutionBadge value={detail.status ?? detail.resolution_status} />
              <span className="text-xs text-muted-foreground">Severity: {str(detail.severity, "unreported")}</span>
              <span className="text-xs text-muted-foreground">Type: {str(detail.type, "unreported")}</span>
            </div>
            <CompareColumns
              leftLabel="Side A"
              rightLabel="Side B"
              left={<MetadataBlock value={detail.side_a ?? detail.claim_a} />}
              right={<MetadataBlock value={detail.side_b ?? detail.claim_b} />}
            />
            <UncertaintyNote>
              {str(detail.reasoning_impact ?? detail.impact, "WOIC has not reported how this conflict affects downstream conclusions.")}
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
