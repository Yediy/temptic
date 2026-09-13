import { Link } from "react-router-dom";
import {
  ArchitectureLinks, CapabilityState, ConfidenceMeter, CoverageMeter, Metric, Panel, PrivacyNotice,
} from "@/components/reasoning/ReasonBits";
import { useReasoningCapability, useReasoningSettings } from "@/hooks/reasoning/use-reasoning";
import { asRecord, num, str } from "@/lib/reasoning/platform";

const TILES: Array<{ key: string; label: string; tone?: "danger" | "warn" | "ok" }> = [
  { key: "active_requests", label: "Active Reasoning Requests" },
  { key: "conclusions_generated", label: "Conclusions Generated" },
  { key: "open_hypotheses", label: "Open Hypotheses" },
  { key: "contradictions", label: "Contradictions", tone: "danger" },
  { key: "insufficient_evidence_results", label: "Insufficient-Evidence Results", tone: "warn" },
  { key: "critical_reviews", label: "Critical Reviews" },
  { key: "model_disagreements", label: "Model Disagreements", tone: "warn" },
  { key: "latency_ms", label: "Latency (ms)" },
  { key: "cost", label: "Cost" },
];

export default function ReasoningOverview() {
  const [settings] = useReasoningSettings();
  const overview = useReasoningCapability<Record<string, unknown>>(
    "reasoning.overview", {}, { refetchInterval: settings.refreshMs },
  );
  const summary = asRecord(overview.data);

  return (
    <div className="space-y-4">
      <CapabilityState status={overview.status} message={overview.message} label="the reasoning overview">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {TILES.map((t) => {
            const raw = summary[t.key];
            return (
              <Metric
                key={t.key}
                label={t.label}
                value={raw == null ? "—" : str(raw)}
                tone={num(raw) != null ? t.tone : undefined}
              />
            );
          })}
          <div className="rounded-md border bg-card p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Average Confidence</p>
            <div className="mt-2"><ConfidenceMeter value={summary.average_confidence} /></div>
          </div>
          <div className="rounded-md border bg-card p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Average Evidence Coverage</p>
            <div className="mt-2"><CoverageMeter value={summary.average_evidence_coverage} /></div>
          </div>
        </div>

        {summary.notes != null && (
          <Panel title="Reasoning Notes" description="Reported by the Phase 6.3A Reasoning API.">
            <p className="whitespace-pre-wrap text-sm">{str(summary.notes)}</p>
          </Panel>
        )}
      </CapabilityState>

      <Panel title="Where to look next" description="Every number above resolves to the records behind it.">
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {[
            ["/reasoning/active", "Requests currently being reasoned about"],
            ["/reasoning/conclusions", "Conclusions with supporting and contradicting evidence"],
            ["/reasoning/hypotheses", "Open hypotheses and what would test them"],
            ["/reasoning/evidence", "Evidence matrix with source, freshness and reliability"],
            ["/reasoning/contradictions", "Unresolved conflicts that must stay visible"],
            ["/reasoning/alternatives", "Alternatives that can be simulated or decided on"],
            ["/reasoning/critical-review", "How critique changed a conclusion"],
            ["/reasoning/causality", "Correlation versus supported causal relation"],
            ["/reasoning/disagreements", "Where faculties or models disagree"],
            ["/reasoning/health", "Service, model and handoff health"],
          ].map(([to, label]) => (
            <li key={to}><Link to={to} className="text-primary hover:underline">{label}</Link></li>
          ))}
        </ul>
      </Panel>

      <Panel title="Architecture" description="Reasoning is governed by the platform registry.">
        <ArchitectureLinks />
      </Panel>

      <PrivacyNotice />
    </div>
  );
}
