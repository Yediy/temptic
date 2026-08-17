import { useState } from "react";
import { CapabilityState, OpsAssistant, Panel, RecordTable, RiskBadge, StateBadge, ActorBadge } from "@/components/autonomy/AutoBits";
import { useCapabilityList, useAutonomySettings } from "@/hooks/autonomy/use-autonomy";
import { OPERATION_STATES, str } from "@/lib/autonomy/platform";
import { cn } from "@/lib/utils";

export default function TasksPage() {
  const [settings] = useAutonomySettings();
  const [state, setState] = useState<string>("");
  const list = useCapabilityList("tasks.list", state ? { state } : {}, { refetchInterval: settings.refreshMs });

  return (
    <div className="space-y-4">
      <Panel
        title="Tasks"
        description="Task execution state across every active coordination."
        actions={
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by state">
            <button type="button" onClick={() => setState("")}
              className={cn("rounded border px-2 py-0.5 text-[11px]", !state && "border-primary text-primary")}>All</button>
            {OPERATION_STATES.map((s) => (
              <button key={s} type="button" onClick={() => setState(s)}
                className={cn("rounded border px-2 py-0.5 text-[11px]", state === s && "border-primary text-primary")}>
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        }
      >
        <CapabilityState status={list.status} message={list.message} label="tasks">
          <RecordTable
            rows={list.rows}
            columns={[
              { key: "name", label: "Task", render: (r) => str(r.name ?? r.title ?? r.id, "—") },
              { key: "coordination", label: "Coordination" },
              { key: "actor", label: "Actor", render: (r) => (
                <span className="flex items-center gap-1">
                  <ActorBadge type={r.actor_type} />
                  <span className="truncate">{str(r.actor ?? r.actor_name, "—")}</span>
                </span>
              ) },
              { key: "status", label: "State", render: (r) => <StateBadge state={r.status ?? r.state} /> },
              { key: "risk", label: "Risk", render: (r) => <RiskBadge risk={r.risk} /> },
              { key: "dependencies", label: "Depends on", render: (r) => (Array.isArray(r.dependencies) ? r.dependencies.length : "—") },
              { key: "started_at", label: "Started" },
              { key: "expected_completion", label: "Expected" },
            ]}
          />
        </CapabilityState>
      </Panel>
      <OpsAssistant context={{ tasks: list.rows, filter: state }} />
    </div>
  );
}
