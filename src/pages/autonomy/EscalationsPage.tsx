import { CapabilityState, OpsAssistant, Panel, RecordTable, RiskBadge, StateBadge } from "@/components/autonomy/AutoBits";
import { useCapabilityList, useAutonomySettings } from "@/hooks/autonomy/use-autonomy";
import { str } from "@/lib/autonomy/platform";

export default function EscalationsPage() {
  const [settings] = useAutonomySettings();
  const list = useCapabilityList("escalations.list", {}, { refetchInterval: settings.refreshMs });
  return (
    <div className="space-y-4">
      <Panel title="Escalations" description="Operations the engine handed back to human judgement.">
        <CapabilityState status={list.status} message={list.message} label="escalations">
          <RecordTable rows={list.rows} columns={[
            { key: "subject", label: "Subject", render: (r) => str(r.subject ?? r.objective ?? r.id, "—") },
            { key: "trigger", label: "Trigger" },
            { key: "actor", label: "Escalated by" },
            { key: "risk", label: "Risk", render: (r) => <RiskBadge risk={r.risk} /> },
            { key: "confidence", label: "Confidence", render: (r) => (r.confidence == null ? "—" : `${Math.round(Number(r.confidence) * 100)}%`) },
            { key: "authority_gap", label: "Authority gap" },
            { key: "status", label: "State", render: (r) => <StateBadge state={r.status ?? r.state} /> },
            { key: "created_at", label: "Raised" },
          ]} />
        </CapabilityState>
      </Panel>
      <OpsAssistant context={{ escalations: list.rows }} tasks={["why_escalated", "needs_me", "highest_risk"]} />
    </div>
  );
}
