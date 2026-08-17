import { Link } from "react-router-dom";
import { EngineeringAssistant, Metric, Panel, RegistryState } from "@/components/architecture/ArchBits";
import { useRegistry, useArchSettings } from "@/hooks/architecture/use-architecture";
import { asArray, asRecord, num, str } from "@/lib/architecture/platform";

const TILES: Array<{ key: string; label: string; tone?: "danger" | "warn" | "ok" }> = [
  { key: "architecture_version", label: "Architecture Version" },
  { key: "constitution_version", label: "Constitution Version" },
  { key: "freeze_status", label: "Freeze Status" },
  { key: "platform_health", label: "Platform Health" },
  { key: "organism_count", label: "Organisms" },
  { key: "service_count", label: "Services" },
  { key: "api_count", label: "APIs" },
  { key: "event_count", label: "Events" },
  { key: "contract_count", label: "Contracts" },
  { key: "capspec_count", label: "CapSpecs" },
  { key: "architecture_violations", label: "Architecture Violations", tone: "danger" },
  { key: "technical_debt", label: "Technical Debt", tone: "warn" },
];

export default function ArchitectureOverview() {
  const [settings] = useArchSettings();
  const overview = useRegistry<Record<string, unknown>>("architecture.overview", {}, { refetchInterval: settings.refreshMs });
  const summary = asRecord(overview.data);
  const recent = asArray(summary.recently_changed_organisms ?? summary.recent_changes);

  return (
    <div className="space-y-3">
      <RegistryState status={overview.status} message={overview.message} label="the architecture overview">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TILES.map((t) => {
            const raw = summary[t.key];
            return <Metric key={t.key} label={t.label} value={raw == null ? "—" : str(raw)} tone={num(raw) ? t.tone : undefined} />;
          })}
        </div>

        <Panel
          title="Recently Changed Organisms"
          description="Change records reported by the Architecture Registry."
          actions={<Link to="/architecture/organisms" className="text-xs text-primary hover:underline">Open Organism Explorer</Link>}
        >
          {recent.length === 0
            ? <p className="text-sm text-muted-foreground">The registry reports no recent organism changes.</p>
            : (
              <ul className="space-y-1">
                {recent.map((r, i) => (
                  <li key={str(r.id, String(i))} className="flex flex-wrap items-center gap-2 border-b py-1.5 text-sm last:border-0">
                    <span className="font-medium">{str(r.name ?? r.organism, "—")}</span>
                    <span className="font-mono text-xs text-muted-foreground">{str(r.version)}</span>
                    <span className="flex-1 truncate text-xs text-muted-foreground">{str(r.change ?? r.summary)}</span>
                    <span className="text-[11px] text-muted-foreground">{str(r.changed_at ?? r.updated_at)}</span>
                  </li>
                ))}
              </ul>
            )}
        </Panel>
      </RegistryState>

      <EngineeringAssistant context={{ overview: summary, recent }} />
    </div>
  );
}
