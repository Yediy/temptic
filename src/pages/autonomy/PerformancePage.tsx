import { CapabilityState, Metric, OpsAssistant, Panel } from "@/components/autonomy/AutoBits";
import { useCapability } from "@/hooks/autonomy/use-autonomy";
import { asRecord, str } from "@/lib/autonomy/platform";

const METRICS: Array<[string, string]> = [
  ["task_completion_rate", "Task Completion Rate"],
  ["human_intervention_rate", "Human Intervention Rate"],
  ["approval_rate", "Approval Rate"],
  ["escalation_rate", "Escalation Rate"],
  ["failure_rate", "Failure Rate"],
  ["rollback_rate", "Rollback Rate"],
  ["avg_completion_time", "Average Completion Time"],
  ["autonomous_vs_manual", "Autonomous vs Manual"],
  ["resource_efficiency", "Resource Efficiency"],
  ["objective_achievement", "Objective Achievement"],
  ["prediction_accuracy", "Prediction Accuracy"],
  ["optimization_accuracy", "Optimization Accuracy"],
];

export default function PerformancePage() {
  const perf = useCapability<Record<string, unknown>>("performance.metrics");
  const m = asRecord(perf.data);
  return (
    <div className="space-y-4">
      <Panel title="Performance" description="Autonomy performance measured by the engine, not by this interface.">
        <CapabilityState status={perf.status} message={perf.message} label="performance metrics">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {METRICS.map(([key, label]) => (
              <Metric key={key} label={label} value={m[key] == null ? "—" : str(m[key])} />
            ))}
          </div>
        </CapabilityState>
      </Panel>
      <OpsAssistant context={{ performance: m }} tasks={["underperforming", "highest_risk"]} />
    </div>
  );
}
