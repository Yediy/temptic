import { Link } from "react-router-dom";
import { Panel, Metric } from "@/components/cognition/CogBits";
import { CapabilityState, PrivacyNotice, ArchitectureLinks } from "@/components/perception/PerceptionBits";
import { usePerceptionCapability, usePerceptionSettings } from "@/hooks/perception/use-perception";
import { asRecord, num, str } from "@/lib/perception/platform";

const TILES: Array<{ key: string; label: string; tone?: "danger" | "warn" | "ok" }> = [
  { key: "observations_processed", label: "Observations Processed" },
  { key: "active_context_packs", label: "Active Context Packs" },
  { key: "high_salience_signals", label: "High-Salience Signals", tone: "warn" },
  { key: "contradictions", label: "Contradictions", tone: "warn" },
  { key: "missing_information", label: "Missing Information", tone: "warn" },
  { key: "stale_context", label: "Stale Context", tone: "danger" },
  { key: "context_coverage", label: "Context Coverage" },
  { key: "entity_resolution_rate", label: "Entity Resolution Rate" },
  { key: "evidence_density", label: "Evidence Density" },
  { key: "source_health", label: "Source Health" },
];

export default function PerceptionOverview() {
  const [settings] = usePerceptionSettings();
  const overview = usePerceptionCapability<Record<string, unknown>>(
    "perception.overview", {}, { refetchInterval: settings.refreshMs },
  );
  const summary = asRecord(overview.data);

  return (
    <div className="space-y-4">
      <CapabilityState status={overview.status} message={overview.message} label="the perception overview">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
        </div>

        {summary.notes != null && (
          <Panel title="Perception Notes" description="Reported by the Phase 6.1A Perception & Context API.">
            <p className="whitespace-pre-wrap text-sm">{str(summary.notes)}</p>
          </Panel>
        )}
      </CapabilityState>

      <Panel title="Where to look next" description="Every number above resolves to the records behind it.">
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {[
            ["/perception/observations", "Inspect the live observation stream"],
            ["/perception/context-packs", "Open an assembled context pack"],
            ["/perception/contradictions", "Unreconciled conflicting observations"],
            ["/perception/missing", "Declared information gaps"],
            ["/perception/freshness", "Requests depending on stale context"],
            ["/perception/sources", "Source and adapter availability"],
          ].map(([to, label]) => (
            <li key={to}><Link to={to} className="text-primary hover:underline">{label}</Link></li>
          ))}
        </ul>
      </Panel>

      <Panel title="Architecture" description="Perception is governed by the platform registry.">
        <ArchitectureLinks />
      </Panel>

      <PrivacyNotice />
    </div>
  );
}
