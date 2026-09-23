import {
  ArchitectureLinks, CapabilityState, ConfidenceMeter, CoverageMeter, MetadataBlock, Metric, Panel,
  PrivacyNotice,
} from "@/components/reasoning/ReasonBits";
import { useReasoningCapability, useReasoningSettings } from "@/hooks/reasoning/use-reasoning";
import { CAPABILITIES, asRecord, str } from "@/lib/reasoning/platform";

const TILES: Array<{ key: string; label: string; tone?: "danger" | "warn" }> = [
  { key: "service_status", label: "Reasoning Service" },
  { key: "model_status", label: "Model Availability" },
  { key: "avg_latency_ms", label: "Average Latency (ms)" },
  { key: "failed_requests", label: "Failed Requests", tone: "danger" },
  { key: "insufficient_evidence_rate", label: "Insufficient-Evidence Rate", tone: "warn" },
  { key: "unresolved_contradictions", label: "Unresolved Contradictions", tone: "danger" },
  { key: "pending_handoffs", label: "Pending Handoffs", tone: "warn" },
  { key: "queue_depth", label: "Queue Depth" },
];

export default function ReasoningHealth() {
  const [settings] = useReasoningSettings();
  const health = useReasoningCapability<Record<string, unknown>>(
    "reasoning.health.get", {}, { refetchInterval: settings.refreshMs },
  );
  const rec = asRecord(health.data);

  return (
    <div className="space-y-4">
      <Panel title="Reasoning Health" description="Reported by the Phase 6.3A Reasoning API.">
        <CapabilityState status={health.status} message={health.message} label="reasoning health">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TILES.map((t) => (
              <Metric key={t.key} label={t.label} value={rec[t.key] == null ? "—" : str(rec[t.key])} tone={rec[t.key] == null ? undefined : t.tone} />
            ))}
            <div className="rounded-md border bg-card p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Confidence Calibration</p>
              <div className="mt-2"><ConfidenceMeter value={rec.confidence_calibration} /></div>
            </div>
            <div className="rounded-md border bg-card p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Evidence Coverage</p>
              <div className="mt-2"><CoverageMeter value={rec.evidence_coverage} /></div>
            </div>
          </div>
          <div className="mt-3 rounded border p-2">
            <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Detail</p>
            <MetadataBlock value={rec.detail ?? rec} />
          </div>
        </CapabilityState>
      </Panel>

      <Panel title="API Integration Matrix" description="Every capability this workspace consumes from 6.3A. Nothing is computed locally.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-1.5 font-medium">Capability</th>
                <th className="px-2 py-1.5 font-medium">Method</th>
                <th className="px-2 py-1.5 font-medium">Type</th>
                <th className="px-2 py-1.5 font-medium">Roles</th>
              </tr>
            </thead>
            <tbody>
              {CAPABILITIES.map((c) => (
                <tr key={c.key} className="border-b last:border-0">
                  <td className="px-2 py-1.5">{c.label}</td>
                  <td className="px-2 py-1.5 font-mono text-xs">{c.method}</td>
                  <td className="px-2 py-1.5 text-xs">{c.mutating ? "REQUEST (executed by 6.3A)" : "READ"}</td>
                  <td className="px-2 py-1.5 text-xs text-muted-foreground">{c.roles.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Architecture"><ArchitectureLinks /></Panel>
      <PrivacyNotice />
    </div>
  );
}
