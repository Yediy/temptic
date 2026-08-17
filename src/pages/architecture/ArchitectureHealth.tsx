import { EngineeringAssistant, Metric, Panel, RecordTable, RegistryState, SeverityBadge } from "@/components/architecture/ArchBits";
import { useRegistry } from "@/hooks/architecture/use-architecture";
import { HEALTH_CHECKS, asArray, asRecord, num, str } from "@/lib/architecture/platform";

export default function ArchitectureHealth() {
  const health = useRegistry<Record<string, unknown>>("health.report");
  const report = asRecord(health.data);
  const checks = asRecord(report.checks);
  const violations = asArray(report.violations);

  return (
    <div className="space-y-3">
      <Panel title="Architecture Health" description="Structural health as reported by the Architecture Registry.">
        <RegistryState status={health.status} message={health.message} label="the architecture health report">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {HEALTH_CHECKS.map((c) => {
              const value = num(asRecord(checks[c.key]).count ?? checks[c.key]);
              return (
                <Metric
                  key={c.key}
                  label={c.label}
                  value={value === null ? "not reported" : value}
                  tone={value && value > 0 ? "warn" : value === 0 ? "ok" : undefined}
                />
              );
            })}
          </div>
        </RegistryState>
      </Panel>

      <Panel title="Violations" description="Architecture violations recorded against organisms." tone="danger">
        <RegistryState status={health.status} message={health.message} label="architecture violations">
          <RecordTable
            rows={violations}
            empty="The registry reports no architecture violations."
            columns={[
              { key: "rule", label: "Rule", render: (r) => <span className="font-mono text-xs">{str(r.rule ?? r.check, "—")}</span> },
              { key: "organism", label: "Organism" },
              { key: "detail", label: "Detail" },
              { key: "severity", label: "Severity", render: (r) => <SeverityBadge value={r.severity} /> },
              { key: "detected_at", label: "Detected", render: (r) => <span className="text-xs">{str(r.detected_at, "—")}</span> },
            ]}
          />
        </RegistryState>
      </Panel>

      <EngineeringAssistant context={{ health: report }} tasks={["investigation_path", "affected_components"]} />
    </div>
  );
}
