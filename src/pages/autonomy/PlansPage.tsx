import { CapabilityState, OpsAssistant, Panel, RecordTable, StateBadge } from "@/components/autonomy/AutoBits";
import { useCapabilityList } from "@/hooks/autonomy/use-autonomy";
import { str } from "@/lib/autonomy/platform";

export default function PlansPage() {
  const list = useCapabilityList("plans.list");
  return (
    <div className="space-y-4">
      <Panel
        title="Plans"
        description="Engine-produced plans with their optimization, simulation, decision and approval references."
      >
        <CapabilityState status={list.status} message={list.message} label="plans">
          <RecordTable
            rows={list.rows}
            columns={[
              { key: "name", label: "Plan", render: (r) => str(r.name ?? r.id, "—") },
              { key: "objective", label: "Objective" },
              { key: "status", label: "Status", render: (r) => <StateBadge state={r.status ?? r.state} /> },
              { key: "optimization_ref", label: "Optimization" },
              { key: "simulation_ref", label: "Simulation" },
              { key: "decision_ref", label: "Decision" },
              { key: "approval_ref", label: "Approval" },
              { key: "tasks_total", label: "Tasks" },
              { key: "progress", label: "Progress", render: (r) => (r.progress == null ? "—" : `${Math.round(Number(r.progress) * 100)}%`) },
              { key: "woic_explanation", label: "WOIC explanation" },
            ]}
          />
        </CapabilityState>
      </Panel>
      <OpsAssistant context={{ plans: list.rows }} />
    </div>
  );
}
