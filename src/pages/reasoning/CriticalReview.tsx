import { useState } from "react";
import {
  CapabilityState, CompareColumns, ConfidenceMeter, ListControls, MetadataBlock, Pager, Panel, RecordTable,
  usePagedRows,
} from "@/components/reasoning/ReasonBits";
import { useReasoningAction, useReasoningList, useReasoningPermissions, useReasoningSettings, useRowFilter } from "@/hooks/reasoning/use-reasoning";
import { str } from "@/lib/reasoning/platform";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

export default function CriticalReview() {
  const [settings] = useReasoningSettings();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [conclusionId, setConclusionId] = useState("");
  const conclusions = useReasoningList("reasoning.conclusions.list");
  const review = useReasoningAction("reasoning.critique.request");
  const perms = useReasoningPermissions();

  const list = useReasoningList("reasoning.critique.list", {}, { refetchInterval: settings.refreshMs });
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);
  const detail = filtered.find((r) => str(r.id ?? r.review_id) === open);

  return (
    <div className="space-y-4">
      <Panel title="Critical Review" description="How WOIC challenged its own conclusions, and what changed as a result.">
        {perms.canRequestCritique && <div className="mb-4 flex flex-wrap items-center gap-2">
          <Select value={conclusionId} onValueChange={setConclusionId} disabled={review.isPending}>
            <SelectTrigger className="w-full min-w-0 max-w-md" aria-label="Conclusion to review"><SelectValue placeholder="Choose a conclusion" /></SelectTrigger>
            <SelectContent>{conclusions.rows.map(r => <SelectItem key={str(r.id)} value={str(r.id)}>{str(r.conclusion ?? r.question ?? r.id)}</SelectItem>)}</SelectContent>
          </Select>
          <Button disabled={!conclusionId || review.isPending} onClick={() => review.mutate({ conclusion_id: conclusionId }, {
            onSuccess: () => toast({ title: "Review completed", description: "Independent assessments and their comparison have been saved." }),
            onError: e => toast({ title: "Review failed", description: e.message, variant: "destructive" }),
          })}>{review.isPending ? "Reviewing…" : "Run critical review"}</Button>
        </div>}
        <CapabilityState status={list.status} message={list.message} label="critical reviews">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter reviews…" />
          <RecordTable
            rows={paged}
            empty="The Reasoning API returned no critical reviews."
            columns={[
              { key: "subject", label: "Reviewed conclusion", render: (r) => (
                <button type="button" className="text-left text-primary hover:underline" onClick={() => setOpen(str(r.id ?? r.review_id))}>
                  {str(r.subject ?? r.conclusion ?? r.id, "—")}
                </button>
              ) },
              { key: "outcome", label: "Outcome" },
              { key: "confidence_before", label: "Confidence before", render: (r) => <ConfidenceMeter value={r.confidence_before} /> },
              { key: "confidence_after", label: "Confidence after", render: (r) => <ConfidenceMeter value={r.confidence_after} /> },
              { key: "reviewed_at", label: "Reviewed" },
            ]}
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {open && detail && (
        <Panel
          title="Critical Review Detail"
          description={str(detail.subject ?? detail.conclusion, "")}
          actions={<button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => setOpen(null)}>Close</button>}
        >
          <div className="space-y-3">
            <CompareColumns
              leftLabel="Before review"
              rightLabel="After review"
              left={<MetadataBlock value={detail.before ?? detail.original} />}
              right={<MetadataBlock value={detail.after ?? detail.revised} />}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded border p-2">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Weak assumptions</p>
                <MetadataBlock value={detail.weak_assumptions} />
              </div>
              <div className="rounded border p-2">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Hypothetical counterexamples</p>
                <MetadataBlock value={detail.counterexamples} />
              </div>
              <div className="rounded border p-2">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Overlooked evidence</p>
                <MetadataBlock value={detail.overlooked_evidence} />
              </div>
              <div className="rounded border p-2">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Revisions applied by WOIC</p>
                <MetadataBlock value={detail.revisions} />
              </div>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
