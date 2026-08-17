import { CapabilityState, OpsAssistant, Panel, RecordTable, RiskBadge, StateBadge } from "@/components/autonomy/AutoBits";
import { useCapabilityList } from "@/hooks/autonomy/use-autonomy";
import { str } from "@/lib/autonomy/platform";

export default function ObjectivesPage() {
  const list = useCapabilityList("objectives.list");
  return (
    <div className="space-y-4">
      <Panel title="Objectives" description="Autonomous objectives with owners, success criteria and governance references.">
        <CapabilityState status={list.status} message={list.message} label="objectives">
          <RecordTable
            rows={list.rows}
            columns={[
              { key: "name", label: "Objective", render: (r) => str(r.name ?? r.objective ?? r.id, "—") },
              { key: "owner", label: "Owner" },
              { key: "success_criteria", label: "Success criteria" },
              { key: "status", label: "Status", render: (r) => <StateBadge state={r.status ?? r.state} /> },
              { key: "progress", label: "Progress", render: (r) => (r.progress == null ? "—" : `${Math.round(Number(r.progress) * 100)}%`) },
              { key: "risk", label: "Risk", render: (r) => <RiskBadge risk={r.risk} /> },
              { key: "decision_ref", label: "Decision" },
              { key: "approval_ref", label: "Approval" },
              { key: "expected_outcome", label: "Expected outcome" },
              { key: "actual_outcome", label: "Actual outcome" },
            ]}
          />
        </CapabilityState>
      </Panel>
      <OpsAssistant context={{ objectives: list.rows }} />
    </div>
  );
}
