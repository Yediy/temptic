import { Link } from "react-router-dom";
import { CapabilityState, Metric, Panel, PrivacyNotice } from "@/components/cognition/CogBits";
import { useCognitiveCapability, useCognitionSettings } from "@/hooks/cognition/use-cognition";
import { asRecord, formatCost, formatLatency, num, str } from "@/lib/cognition/platform";

const TILES: Array<{ key: string; label: string; tone?: "danger" | "warn" | "ok"; format?: (v: unknown) => string }> = [
  { key: "active_requests", label: "Active Cognitive Requests" },
  { key: "active_sessions", label: "Active Sessions" },
  { key: "faculty_health", label: "Faculty Health" },
  { key: "model_provider_health", label: "Model Provider Health" },
  { key: "average_confidence", label: "Average Confidence" },
  { key: "evidence_coverage", label: "Evidence Coverage" },
  { key: "contradictions", label: "Contradictions", tone: "warn" },
  { key: "escalations", label: "Escalations", tone: "warn" },
  { key: "insufficient_evidence_events", label: "Insufficient Evidence Events", tone: "danger" },
  { key: "cognitive_cost", label: "Cognitive Cost", format: formatCost },
  { key: "latency_p95", label: "Latency (p95)", format: formatLatency },
  { key: "budget_utilization", label: "Budget Utilization" },
];

export default function CognitiveOverview() {
  const [settings] = useCognitionSettings();
  const overview = useCognitiveCapability<Record<string, unknown>>(
    "cognition.overview", {}, { refetchInterval: settings.refreshMs },
  );
  const summary = asRecord(overview.data);

  return (
    <div className="space-y-4">
      <CapabilityState status={overview.status} message={overview.message} label="the cognitive overview">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TILES.map((t) => {
            const raw = summary[t.key];
            const value = raw == null ? "—" : t.format ? t.format(raw) : str(raw);
            return <Metric key={t.key} label={t.label} value={value} tone={num(raw) != null ? t.tone : undefined} />;
          })}
        </div>

        {summary.notes != null && (
          <Panel title="Cognitive Core Notes" description="Reported by the Phase 6.0A Cognitive Control API.">
            <p className="whitespace-pre-wrap text-sm">{str(summary.notes)}</p>
          </Panel>
        )}
      </CapabilityState>

      <Panel
        title="Where to look next"
        description="Every number above resolves to the operations behind it."
      >
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {[
            ["/cognition/requests", "Inspect individual cognitive requests"],
            ["/cognition/escalations", "Operations waiting on a human"],
            ["/cognition/contradictions", "Unreconciled evidence conflicts"],
            ["/cognition/uncertainty", "Declared unknowns and gaps"],
            ["/cognition/models", "Provider-neutral model health"],
            ["/cognition/budgets", "Cost and consumption"],
          ].map(([to, label]) => (
            <li key={to}>
              <Link to={to} className="text-primary hover:underline">{label}</Link>
            </li>
          ))}
        </ul>
      </Panel>

      <PrivacyNotice />
    </div>
  );
}
