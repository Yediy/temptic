import { Link } from "react-router-dom";
import { CapabilityState, Panel, Metric, ArchitectureLinks, PrivacyNotice } from "@/components/memory/MemBits";
import { useMemoryCapability, useMemorySettings } from "@/hooks/memory/use-memory";
import { asRecord, num, str } from "@/lib/memory/platform";

const TILES: Array<{ key: string; label: string; tone?: "danger" | "warn" | "ok" }> = [
  { key: "active_sessions", label: "Active Sessions" },
  { key: "active_memory_items", label: "Active Memory Items" },
  { key: "memory_utilization", label: "Memory Utilization", tone: "warn" },
  { key: "compression_rate", label: "Compression Rate" },
  { key: "eviction_rate", label: "Eviction Rate", tone: "warn" },
  { key: "open_questions", label: "Open Questions", tone: "warn" },
  { key: "active_hypotheses", label: "Active Hypotheses" },
  { key: "pending_faculty_calls", label: "Pending Faculty Calls" },
  { key: "checkpoints", label: "Checkpoints" },
  { key: "budget_usage", label: "Budget Usage", tone: "warn" },
  { key: "expired_items", label: "Expired Items", tone: "danger" },
  { key: "health", label: "Health" },
];

export default function MemoryOverview() {
  const [settings] = useMemorySettings();
  const overview = useMemoryCapability<Record<string, unknown>>(
    "memory.overview", {}, { refetchInterval: settings.refreshMs },
  );
  const summary = asRecord(overview.data);

  return (
    <div className="space-y-4">
      <CapabilityState status={overview.status} message={overview.message} label="the working-memory overview">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
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
          <Panel title="Memory Notes" description="Reported by the Phase 6.2A Working Memory API.">
            <p className="whitespace-pre-wrap text-sm">{str(summary.notes)}</p>
          </Panel>
        )}
      </CapabilityState>

      <Panel title="Where to look next" description="Every number above resolves to the records behind it.">
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {[
            ["/memory/sessions", "Sessions currently holding working memory"],
            ["/memory/items", "Individual memory items and retention classes"],
            ["/memory/questions", "Unresolved questions blocking confidence"],
            ["/memory/checkpoints", "Checkpoints available for backend restoration"],
            ["/memory/compression", "What was collapsed and what provenance survived"],
            ["/memory/lifecycle", "Eviction and expiry versus promotion"],
            ["/memory/budgets", "Budget consumption and threshold warnings"],
            ["/memory/health", "Capacity pressure, conflicts and failures"],
          ].map(([to, label]) => (
            <li key={to}><Link to={to} className="text-primary hover:underline">{label}</Link></li>
          ))}
        </ul>
      </Panel>

      <Panel title="Architecture" description="Working memory is governed by the platform registry.">
        <ArchitectureLinks />
      </Panel>

      <PrivacyNotice />
    </div>
  );
}
