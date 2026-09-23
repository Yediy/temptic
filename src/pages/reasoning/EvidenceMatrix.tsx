import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  CapabilityState, CoverageMeter, ListControls, MetadataBlock, Pager, Panel, RecordTable, StanceBadge,
  usePagedRows,
} from "@/components/reasoning/ReasonBits";
import {
  useReasoningAction, useReasoningList, useReasoningPermissions, useReasoningSettings, useRowFilter,
} from "@/hooks/reasoning/use-reasoning";
import { str } from "@/lib/reasoning/platform";

export default function EvidenceMatrix() {
  const [settings] = useReasoningSettings();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const perms = useReasoningPermissions();
  const request = useReasoningAction("reasoning.evidence.request");

  const list = useReasoningList("reasoning.evidence.list", {}, { refetchInterval: settings.refreshMs });
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);
  const detail = filtered.find((r) => str(r.id ?? r.evidence_id) === open);

  return (
    <div className="space-y-4">
      <Panel
        title="Evidence Matrix"
        description="Every evidence item WOIC used, with its source, freshness, reliability and stance."
        actions={perms.canRequestCritique && (
          <Button
            size="sm"
            variant="outline"
            disabled={request.isPending}
            onClick={() => request.mutate({}, {
              onSuccess: () => toast({ title: "Additional evidence requested", description: "WOIC will gather and re-evaluate." }),
              onError: (e) => toast({ title: "Request failed", description: String(e), variant: "destructive" }),
            })}
          >
            {request.isPending ? "Requesting…" : "Request additional evidence"}
          </Button>
        )}
      >
        <CapabilityState status={list.status} message={list.message} label="the evidence matrix">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter by source, stance, subject…" />
          <RecordTable
            rows={paged}
            empty="The Reasoning API returned no evidence records."
            columns={[
              { key: "summary", label: "Evidence", render: (r) => (
                <button type="button" className="text-left text-primary hover:underline" onClick={() => setOpen(str(r.id ?? r.evidence_id))}>
                  {str(r.summary ?? r.statement ?? r.label ?? r.id, "—")}
                </button>
              ) },
              { key: "source", label: "Source" },
              { key: "stance", label: "Stance", render: (r) => <StanceBadge value={r.stance ?? r.classification} /> },
              { key: "freshness", label: "Freshness" },
              { key: "reliability", label: "Reliability" },
              { key: "coverage", label: "Coverage", render: (r) => <CoverageMeter value={r.coverage} /> },
              { key: "used_in", label: "Used in" },
            ]}
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {open && detail && (
        <Panel
          title="Evidence Item"
          description={str(detail.summary ?? detail.statement, "")}
          actions={<button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => setOpen(null)}>Close</button>}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded border p-2">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Provenance</p>
              <MetadataBlock value={detail.provenance ?? { source: detail.source, captured_at: detail.captured_at, freshness: detail.freshness, reliability: detail.reliability }} />
            </div>
            <div className="rounded border p-2">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Used in conclusions</p>
              <MetadataBlock value={detail.used_in ?? detail.conclusions} />
            </div>
            <div className="rounded border p-2 md:col-span-2">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Gaps and limitations</p>
              <MetadataBlock value={detail.gaps ?? detail.limitations} />
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
