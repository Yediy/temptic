import { Link } from "react-router-dom";
import {
  ArchitectureLinks, CapabilityState, MetadataBlock, Metric, Panel, PrivacyNotice,
} from "@/components/memory/MemBits";
import { useMemoryCapability, useMemorySettings } from "@/hooks/memory/use-memory";
import { HEALTH_SIGNALS, asRecord, num, str } from "@/lib/memory/platform";

export default function MemoryHealth() {
  const [settings] = useMemorySettings();
  const health = useMemoryCapability<Record<string, unknown>>(
    "memory.health.get", {}, { refetchInterval: settings.refreshMs },
  );
  const data = asRecord(health.data);
  const signals = asRecord(data.signals ?? data);

  return (
    <div className="space-y-4">
      <Panel title="Memory Health" description="Pressure, staleness, conflicts and failure counters reported by WOIC.">
        <CapabilityState status={health.status} message={health.message} label="working-memory health">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {HEALTH_SIGNALS.map((s) => {
              const raw = signals[s.key];
              const value = num(raw);
              return (
                <Metric
                  key={s.key}
                  label={s.label}
                  value={raw == null ? "—" : str(raw)}
                  tone={value != null && value > 0 ? "warn" : undefined}
                  hint={s.detail}
                />
              );
            })}
          </div>

          {data.notes != null && (
            <div className="mt-3">
              <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Notes</p>
              <MetadataBlock value={data.notes} />
            </div>
          )}
        </CapabilityState>
      </Panel>

      <Panel title="Related surfaces" description="Health signals resolve into these workspaces.">
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {[
            ["/memory/checkpoints", "Checkpoint and restore failures"],
            ["/memory/budgets", "Budget pressure by dimension"],
            ["/memory/lifecycle", "Expiry and eviction versus promotion"],
            ["/cognition/escalations", "Escalated cognitive sessions"],
            ["/perception/freshness", "Context freshness feeding memory"],
            ["/activity/health", "Platform system health"],
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
