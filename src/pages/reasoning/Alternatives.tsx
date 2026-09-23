import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  CapabilityState, ConfidenceMeter, ListControls, MetadataBlock, Pager, Panel, RecordTable, usePagedRows,
} from "@/components/reasoning/ReasonBits";
import {
  useReasoningAction, useReasoningList, useReasoningPermissions, useReasoningSettings, useRowFilter,
} from "@/hooks/reasoning/use-reasoning";
import { str } from "@/lib/reasoning/platform";

export default function Alternatives() {
  const [settings] = useReasoningSettings();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const perms = useReasoningPermissions();

  const simulate = useReasoningAction("reasoning.alternative.simulate");
  const toDecision = useReasoningAction("reasoning.alternative.to_decision");
  const reasonMore = useReasoningAction("reasoning.alternative.reason_further");

  const list = useReasoningList("reasoning.alternatives.list", {}, { refetchInterval: settings.refreshMs });
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);
  const detail = filtered.find((r) => str(r.id ?? r.alternative_id) === open);

  const run = (m: ReturnType<typeof useReasoningAction>, title: string) =>
    m.mutate({ alternative_id: open }, {
      onSuccess: () => toast({ title, description: "The handoff was performed by WOIC." }),
      onError: (e) => toast({ title: "Request failed", description: String(e), variant: "destructive" }),
    });

  return (
    <div className="space-y-4">
      <Panel title="Alternatives" description="Alternative explanations and recommendations WOIC considered, and why they were not selected.">
        <CapabilityState status={list.status} message={list.message} label="alternatives">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter alternatives…" />
          <RecordTable
            rows={paged}
            empty="The Reasoning API returned no alternatives."
            columns={[
              { key: "alternative", label: "Alternative", render: (r) => (
                <button type="button" className="text-left text-primary hover:underline" onClick={() => setOpen(str(r.id ?? r.alternative_id))}>
                  {str(r.alternative ?? r.option ?? r.statement ?? r.id, "—")}
                </button>
              ) },
              { key: "selected", label: "Selected", render: (r) => (
                r.selected == null ? <span className="text-muted-foreground">—</span>
                  : <span className={r.selected ? "text-emerald-400" : "text-muted-foreground"}>{r.selected ? "SELECTED" : "NOT SELECTED"}</span>
              ) },
              { key: "confidence", label: "Confidence", render: (r) => <ConfidenceMeter value={r.confidence} /> },
              { key: "rejection_reason", label: "Why not selected" },
              { key: "risk", label: "Risk" },
            ]}
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {open && detail && (
        <Panel
          title="Alternative"
          description={str(detail.alternative ?? detail.option, "")}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {perms.canHandoff && (
                <>
                  <Button size="sm" variant="outline" disabled={simulate.isPending} onClick={() => run(simulate, "Sent to simulation")}>Send to simulation</Button>
                  <Button size="sm" variant="outline" disabled={toDecision.isPending} onClick={() => run(toDecision, "Sent to decision console")}>Send to decisions</Button>
                  <Button size="sm" variant="outline" disabled={reasonMore.isPending} onClick={() => run(reasonMore, "Further reasoning requested")}>Reason further</Button>
                </>
              )}
              <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => setOpen(null)}>Close</button>
            </div>
          }
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded border p-2">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Supporting evidence</p>
              <MetadataBlock value={detail.supporting_evidence} />
            </div>
            <div className="rounded border p-2">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Why WOIC did not select it</p>
              <MetadataBlock value={detail.rejection_reason ?? detail.why_not_selected} />
            </div>
            <div className="rounded border p-2">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Risk and trade-offs</p>
              <MetadataBlock value={detail.risk ?? detail.tradeoffs} />
            </div>
            <div className="rounded border p-2">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Conditions that would make it preferable</p>
              <MetadataBlock value={detail.conditions ?? detail.when_preferable} />
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
