import { Button } from "@/components/ui/button";
import { MetadataBlock, Panel } from "@/components/cognition/CogBits";
import {
  ArchitectureLinks, CapabilityState, ContractChips, PrivacyNotice,
} from "@/components/perception/PerceptionBits";
import {
  usePerceptionCapability, usePerceptionPermissions, usePerceptionSettings, usePinnedObservations,
} from "@/hooks/perception/use-perception";
import { CAPABILITIES, DEFAULT_PERCEPTION_SETTINGS, PERCEPTION_FUNCTION } from "@/lib/perception/platform";

const REFRESH_OPTIONS = [
  { label: "5 seconds", value: 5000 },
  { label: "15 seconds", value: 15000 },
  { label: "30 seconds", value: 30000 },
  { label: "60 seconds", value: 60000 },
];
const PAGE_SIZES = [10, 25, 50, 100];

export default function PerceptionSettings() {
  const [settings, setSettings] = usePerceptionSettings();
  const { pins, clear } = usePinnedObservations();
  const perms = usePerceptionPermissions();
  const privacy = usePerceptionCapability<Record<string, unknown>>(
    "privacy.inspect", {}, { enabled: perms.canPrivacyInspect },
  );

  return (
    <div className="space-y-4">
      <Panel title="Workspace Preferences" description="Display-only preferences stored in this browser.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">Refresh interval</span>
            <select
              value={settings.refreshMs}
              onChange={(e) => setSettings({ ...settings, refreshMs: Number(e.target.value) })}
              className="h-8 w-full rounded-md border bg-background px-2 text-sm"
            >
              {REFRESH_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">Rows per page</span>
            <select
              value={settings.pageSize}
              onChange={(e) => setSettings({ ...settings, pageSize: Number(e.target.value) })}
              className="h-8 w-full rounded-md border bg-background px-2 text-sm"
            >
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">Table density</span>
            <select
              value={settings.density}
              onChange={(e) => setSettings({ ...settings, density: e.target.value as "comfortable" | "dense" })}
              className="h-8 w-full rounded-md border bg-background px-2 text-sm"
            >
              <option value="dense">Dense</option>
              <option value="comfortable">Comfortable</option>
            </select>
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">Observation stream</span>
            <select
              value={settings.streamPaused ? "paused" : "live"}
              onChange={(e) => setSettings({ ...settings, streamPaused: e.target.value === "paused" })}
              className="h-8 w-full rounded-md border bg-background px-2 text-sm"
            >
              <option value="live">Live</option>
              <option value="paused">Paused</option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setSettings(DEFAULT_PERCEPTION_SETTINGS)}>
            Reset preferences
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={pins.length === 0} onClick={clear}>
            Clear {pins.length} pinned observation{pins.length === 1 ? "" : "s"}
          </Button>
        </div>
      </Panel>

      <Panel
        title="Privacy &amp; Permission Scope"
        description="Classification, exclusions and purpose limitation reported by the Perception & Context API."
      >
        {!perms.canPrivacyInspect ? (
          <p className="text-sm text-muted-foreground">
            Your role does not include perception privacy inspection.
          </p>
        ) : (
          <CapabilityState status={privacy.status} message={privacy.message} label="the privacy inspector">
            <MetadataBlock value={privacy.data} />
          </CapabilityState>
        )}
      </Panel>

      <Panel title="Capability Registry" description={`Every read routes through the ${PERCEPTION_FUNCTION} organism (Phase 6.1A).`}>
        <ul className="grid gap-1.5 lg:grid-cols-2">
          {CAPABILITIES.map((c) => (
            <li key={c.key} className="rounded-md border p-2">
              <p className="text-xs font-semibold">{c.label}</p>
              <p className="text-[11px] text-muted-foreground">{c.description}</p>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                {c.method} · {c.mutating ? "mutating" : "read-only"} · {c.roles.join(", ")}
              </p>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Architecture" description="This workspace is registered against the platform contract set.">
        <div className="space-y-2">
          <ContractChips />
          <ArchitectureLinks />
        </div>
      </Panel>

      <PrivacyNotice />
    </div>
  );
}
