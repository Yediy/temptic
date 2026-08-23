import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CapabilityState, ConfidenceMeter, ListControls, MetadataBlock, Pager, Panel,
  PrivacyNotice, RecordTable, SessionStateBadge, UtilizationMeter, usePagedRows,
} from "@/components/memory/MemBits";
import {
  useMemoryControl, useMemoryList, useMemoryPermissions, useMemorySettings, useRowFilter,
} from "@/hooks/memory/use-memory";
import { asArray, asRecord, formatTime, str } from "@/lib/memory/platform";
import type { MemoryCapabilityKey } from "@/lib/memory/platform";

/**
 * A CognitiveSession is an objective holding working memory — not a chat.
 * All controls below are *requests* executed by the Phase 6.2A backend.
 */
export default function MemorySessions() {
  const [settings] = useMemorySettings();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const perms = useMemoryPermissions();

  const list = useMemoryList("memory.sessions.list", {}, { refetchInterval: settings.refreshMs });
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);

  const pause = useMemoryControl("memory.session.pause");
  const resume = useMemoryControl("memory.session.resume");
  const close = useMemoryControl("memory.session.close");
  const checkpoint = useMemoryControl("memory.checkpoint.create");
  const refresh = useMemoryControl("memory.context.refresh");
  const review = useMemoryControl("memory.review.request");

  const detail = asRecord(selected);
  const sessionId = str(detail.id ?? detail.session_id);

  const run = (
    label: string,
    mutation: { mutateAsync: (p: Record<string, unknown>) => Promise<unknown>; isPending: boolean },
  ) => {
    if (!sessionId) return;
    mutation
      .mutateAsync({ session_id: sessionId })
      .then(() => toast.success(`${label} accepted by WOIC.`))
      .catch((e: Error) => toast.error(e.message || `${label} was not accepted.`));
  };

  const CONTROLS: Array<{
    label: string;
    capability: MemoryCapabilityKey;
    mutation: typeof pause;
  }> = [
    { label: "Pause Session", capability: "memory.session.pause", mutation: pause },
    { label: "Resume Session", capability: "memory.session.resume", mutation: resume },
    { label: "Create Checkpoint", capability: "memory.checkpoint.create", mutation: checkpoint },
    { label: "Request Context Refresh", capability: "memory.context.refresh", mutation: refresh },
    { label: "Request Cognitive Review", capability: "memory.review.request", mutation: review },
    { label: "Close Session", capability: "memory.session.close", mutation: close },
  ];

  return (
    <div className="space-y-4">
      <Panel title="Active Cognitive Sessions" description="Sessions holding working memory, with utilization, budget and checkpoint state.">
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
              { key: "status", label: "Status", render: (r) => <SessionStateBadge value={r.status ?? r.state} /> },
              { key: "memory_utilization", label: "Memory", render: (r) => <UtilizationMeter value={r.memory_utilization} label="Memory" /> },
              { key: "context_coverage", label: "Coverage", render: (r) => <UtilizationMeter value={r.context_coverage} label="Coverage" /> },
              { key: "open_questions", label: "Questions", render: (r) => str(r.open_question_count ?? asArray(r.open_questions).length, "—") },
              { key: "hypotheses", label: "Hypotheses", render: (r) => str(r.hypothesis_count ?? asArray(r.hypotheses).length, "—") },
              { key: "confidence", label: "Confidence", render: (r) => <ConfidenceMeter value={r.confidence} /> },
              { key: "last_checkpoint", label: "Last Checkpoint", render: (r) => formatTime(r.last_checkpoint_at ?? asRecord(r.last_checkpoint).created_at) },
            ]}
            empty="No cognitive session is currently holding working memory for this organization."
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {selected && (
        <Panel title="Session Detail" description="Reported by WOIC. Nothing on this panel is computed locally.">
          <div className="grid gap-3 lg:grid-cols-2">
            {[
              ["Objective", detail.objective],
              ["Status", detail.status ?? detail.state],
              ["Current Subgoals", detail.subgoals],
              ["Memory Utilization", detail.memory_utilization],
              ["Context Coverage", detail.context_coverage],
              ["Active Claims", detail.claims],
              ["Open Questions", detail.open_questions],
              ["Hypotheses", detail.hypotheses],
              ["Constraints", detail.constraints],
              ["Assumptions", detail.assumptions],
              ["Faculties", detail.faculties],
              ["Cognitive Budget", detail.budget],
              ["Last Checkpoint", detail.last_checkpoint ?? detail.last_checkpoint_at],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">{String(label)}</p>
                <MetadataBlock value={value} />
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2 rounded-md border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Operator Controls</p>
            <p className="text-[11px] text-muted-foreground">
              Each control sends a governed request to the Phase 6.2A Working Memory API. The frontend never
              pauses, checkpoints or restores cognition itself, and cannot edit memory contents.
            </p>
            <div className="flex flex-wrap gap-2">
              {CONTROLS.map((c) => {
                const allowed = perms.can(c.capability);
                return (
                  <Button
                    key={c.label}
                    size="sm"
                    variant="outline"
                    disabled={!allowed || !sessionId || c.mutation.isPending}
                    title={allowed ? undefined : "Your role is not permitted to perform this control."}
                    onClick={() => run(c.label, c.mutation)}
                  >
                    {c.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </Panel>
      )}

      <PrivacyNotice />
    </div>
  );
}
