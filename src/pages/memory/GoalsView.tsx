import { useState } from "react";
import {
  CapabilityState, GoalStateBadge, ListControls, MetadataBlock, Pager, Panel, PrivacyNotice,
  RecordTable, usePagedRows,
} from "@/components/memory/MemBits";
import { useMemoryList, useMemorySettings, useRowFilter } from "@/hooks/memory/use-memory";
import { asArray, asRecord, str } from "@/lib/memory/platform";

/** Goal decomposition is produced by WOIC. No planning happens in this workspace. */
export default function GoalsView() {
  const [settings] = useMemorySettings();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const list = useMemoryList("memory.goals.list", {}, { refetchInterval: settings.refreshMs });
  const filtered = useRowFilter(list.rows, query);
  const { paged, page, setPage } = usePagedRows(filtered, settings.pageSize);
  const detail = asRecord(selected);
  const subgoals = asArray(detail.subgoals);

  return (
    <div className="space-y-4">
      <Panel title="Goals & Subgoals" description="The goal structure WOIC reports for each session, including blockers and dependencies.">
        <CapabilityState status={list.status} message={list.message} label="cognitive goals">
          <ListControls query={query} onQuery={setQuery} count={filtered.length} placeholder="Filter goals…" />
          <RecordTable
            rows={paged}
            columns={[
              { key: "goal", label: "Goal", render: (r) => (
                <button type="button" className="text-left text-primary hover:underline" onClick={() => setSelected(r)}>
                  {str(r.goal ?? r.objective ?? r.title, "(no goal reported)")}
                </button>
              ) },
              { key: "status", label: "Status", render: (r) => <GoalStateBadge value={r.status ?? r.state} /> },
              { key: "session_id", label: "Session", render: (r) => str(r.session_id, "—") },
              { key: "subgoals", label: "Subgoals", render: (r) => str(r.subgoal_count ?? asArray(r.subgoals).length, "—") },
              { key: "completed", label: "Completed", render: (r) => str(r.completed_count, "—") },
              { key: "blocked", label: "Blocked", render: (r) => str(r.blocked_count, "—") },
              { key: "waiting", label: "Waiting", render: (r) => str(r.waiting_count, "—") },
              { key: "dependencies", label: "Dependencies", render: (r) => str(asArray(r.dependencies).length || r.dependency_count, "—") },
            ]}
            empty="No goal structure was reported for this organization."
          />
          <Pager page={page} pageSize={settings.pageSize} total={filtered.length} onPage={setPage} />
        </CapabilityState>
      </Panel>

      {selected && (
        <Panel title="Goal Decomposition" description="Main goal, subgoals and their dependencies exactly as reported.">
          <div className="rounded-md border border-primary/50 bg-primary/5 px-3 py-2 text-sm font-semibold">
            {str(detail.goal ?? detail.objective, "(no goal reported)")}
          </div>
          {subgoals.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No subgoals were reported for this goal.</p>
          ) : (
            <ul className="mt-2 space-y-1.5 border-l pl-4">
              {subgoals.map((sg, i) => (
                <li key={i} className="rounded-md border p-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm">{str(sg.title ?? sg.goal ?? sg.name, `Subgoal ${i + 1}`)}</span>
                    <GoalStateBadge value={sg.status ?? sg.state} />
                  </div>
                  {(sg.dependencies != null || sg.blocked_by != null) && (
                    <div className="mt-1 grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Dependencies</p>
                        <MetadataBlock value={sg.dependencies} />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Blocked By</p>
                        <MetadataBlock value={sg.blocked_by} />
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      <PrivacyNotice />
    </div>
  );
}
