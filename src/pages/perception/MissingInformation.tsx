import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ListControls, MetadataBlock, Pager, Panel, RecordTable, usePagedRows } from "@/components/cognition/CogBits";
import { CapabilityState, PrivacyNotice, ScoreMeter, SeverityBadge, UnresolvedFlag } from "@/components/perception/PerceptionBits";
import { usePerceptionList, usePerceptionSettings, useRowFilter } from "@/hooks/perception/use-perception";
import { useGapWorkflows, gapId, gapTitle } from "@/hooks/perception/use-gap-workflows";
import { str } from "@/lib/perception/platform";

export default function MissingInformation() {
  const [settings] = usePerceptionSettings();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [note, setNote] = useState("");

  const list = usePerceptionList("missing.list", {}, { refetchInterval: settings.refreshMs });
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);
  const { byGap, createTask, escalate, completeTask } = useGapWorkflows();

  const linked = selected ? byGap.get(gapId(selected)) ?? [] : [];

  async function run(kind: "task" | "escalate") {
    if (!selected) return;
    try {
      if (kind === "task") {
        await createTask.mutateAsync({ gap: selected, note: note.trim() || undefined });
        toast.success("Resolution task created in Tasks.");
      } else {
        await escalate.mutateAsync({ gap: selected, note: note.trim() || undefined });
        toast.success("Gap escalated — notification and event recorded.");
      }
      setNote("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The workflow could not be recorded.");
    }
  }

  return (
    <div className="space-y-4">
      <Panel
        title="Missing Information"
        description="Gaps WOIC declared. Unknowns are shown as unknowns — nothing is filled in on the client."
        tone="warn"
      >
        <CapabilityState status={list.status} message={list.message} label="declared information gaps">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter gaps…" />
          <RecordTable
            rows={paged}
            columns={[
              { key: "missing_item", label: "Missing Item", render: (r) => (
                <button type="button" className="text-left text-primary hover:underline" onClick={() => { setSelected(r); setNote(""); }}>
                  {str(r.missing_item ?? r.item ?? r.id, "(unnamed gap)")}
                </button>
              ) },
              { key: "why_needed", label: "Why Needed", render: (r) => str(r.why_needed ?? r.reason, "—") },
              { key: "impact_on_confidence", label: "Impact on Confidence", render: (r) => (
                <ScoreMeter value={r.impact_on_confidence} label="Confidence impact" />
              ) },
              { key: "severity", label: "Severity", render: (r) => <SeverityBadge value={r.severity} /> },
              { key: "blocking_status", label: "Blocking", render: (r) =>
                r.blocking ? <UnresolvedFlag>blocking</UnresolvedFlag> : str(r.blocking_status ?? r.blocking, "—") },
              { key: "recommended_resolution", label: "Recommended Resolution", render: (r) =>
                str(r.recommended_resolution, "—") },
              { key: "requesting_faculty", label: "Requesting Faculty", render: (r) => str(r.requesting_faculty, "—") },
              { key: "workflow", label: "Follow-up", render: (r) => {
                const rows = byGap.get(gapId(r)) ?? [];
                const open = rows.filter((t) => t.status !== "done").length;
                return rows.length === 0
                  ? <span className="text-xs text-muted-foreground">none</span>
                  : <Badge variant="outline" className="text-[10px]">{open > 0 ? `${open} open task${open > 1 ? "s" : ""}` : "resolved"}</Badge>;
              } },
              { key: "actions", label: "", render: (r) => (
                <Button type="button" size="sm" variant="outline" onClick={() => { setSelected(r); setNote(""); }}>
                  Resolve / escalate
                </Button>
              ) },
            ]}
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {selected && (
        <Panel
          title={`Gap Detail — ${gapTitle(selected)}`}
          description="Reported verbatim by the Perception & Context API. Follow-up is recorded in existing platform workflows."
          actions={<Button type="button" size="sm" variant="ghost" onClick={() => setSelected(null)}>Close</Button>}
        >
          <MetadataBlock value={selected} />

          <div className="mt-3 space-y-2 border-t pt-3">
            <label className="text-xs font-medium" htmlFor="gap-note">Operator note (recorded with the workflow)</label>
            <Textarea
              id="gap-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What is being done to supply this information, or why it must be escalated?"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={createTask.isPending} onClick={() => run("task")}>
                {createTask.isPending ? "Creating…" : "Create resolution task"}
              </Button>
              <Button type="button" size="sm" variant="destructive" disabled={escalate.isPending} onClick={() => run("escalate")}>
                {escalate.isPending ? "Escalating…" : "Escalate gap"}
              </Button>
              <Button asChild type="button" size="sm" variant="outline">
                <Link to="/ttos/tasks">Open Tasks</Link>
              </Button>
              <Button asChild type="button" size="sm" variant="outline">
                <Link to="/cognition/escalations">Escalation Center</Link>
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Tasks and escalations are stored in the TTOS work fabric and emitted to the Event Fabric. This workspace
              does not close gaps itself — only the Perception &amp; Context API can report a gap as filled.
            </p>
          </div>

          {linked.length > 0 && (
            <div className="mt-3 space-y-2 border-t pt-3">
              <p className="text-xs font-medium">Linked follow-up</p>
              <ul className="space-y-1">
                {linked.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 rounded border px-2 py-1 text-xs">
                    <span className="truncate">{t.title}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
                      {t.status !== "done" && (
                        <Button type="button" size="sm" variant="ghost" disabled={completeTask.isPending}
                          onClick={async () => {
                            try {
                              await completeTask.mutateAsync(t.id);
                              toast.success("Task marked done.");
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : "Could not update the task.");
                            }
                          }}>
                          Mark done
                        </Button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      )}

      <PrivacyNotice />
    </div>
  );
}
