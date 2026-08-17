import { Panel } from "@/components/architecture/ArchBits";
import { useArchPermissions, useArchSettings } from "@/hooks/architecture/use-architecture";
import {
  ARCHITECTURE_VERSION, CAPABILITY_SPEC, CONSTITUTION_VERSION, PLATFORM_CONTRACT, PLATFORM_DNA,
  type ConsoleDensity,
} from "@/lib/architecture/platform";

export default function ArchSettings() {
  const [settings, setSettings] = useArchSettings();
  const { roles, isSuperAdmin } = useArchPermissions();

  return (
    <div className="space-y-3">
      <Panel title="Console Preferences" description="Local display preferences. Nothing here changes the Architecture Registry.">
        <div className="space-y-3">
          <label className="flex flex-wrap items-center gap-2 text-sm">
            <span className="w-40 text-muted-foreground">Information density</span>
            <select
              value={settings.density}
              onChange={(e) => setSettings({ ...settings, density: e.target.value as ConsoleDensity })}
              className="h-8 rounded-md border bg-background px-2 text-xs"
            >
              <option value="comfortable">Comfortable</option>
              <option value="dense">Dense</option>
            </select>
          </label>

          <label className="flex flex-wrap items-center gap-2 text-sm">
            <span className="w-40 text-muted-foreground">Refresh interval</span>
            <select
              value={settings.refreshMs}
              onChange={(e) => setSettings({ ...settings, refreshMs: Number(e.target.value) })}
              className="h-8 rounded-md border bg-background px-2 text-xs"
            >
              <option value={30000}>30 seconds</option>
              <option value={60000}>1 minute</option>
              <option value={300000}>5 minutes</option>
              <option value={0}>Manual only</option>
            </select>
          </label>

          <label className="flex flex-wrap items-center gap-2 text-sm">
            <span className="w-40 text-muted-foreground">Navigation width</span>
            <input
              type="range" min={200} max={360} step={10}
              value={settings.treeWidth}
              onChange={(e) => setSettings({ ...settings, treeWidth: Number(e.target.value) })}
              aria-label="Navigation width"
            />
            <span className="font-mono text-xs text-muted-foreground">{settings.treeWidth}px</span>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.showRegistryIds}
              onChange={(e) => setSettings({ ...settings, showRegistryIds: e.target.checked })}
              className="h-4 w-4 rounded border"
            />
            <span>Show canonical registry ids</span>
          </label>
        </div>
      </Panel>

      <Panel title="Console Identity" description="Governing documents this console is built against.">
        <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
          {[
            ["Platform Contract", PLATFORM_CONTRACT],
            ["Capability Specification", CAPABILITY_SPEC],
            ["Platform DNA", PLATFORM_DNA],
            ["Architecture version", ARCHITECTURE_VERSION],
            ["Constitution version", CONSTITUTION_VERSION],
            ["Your roles", roles.join(", ") || "none"],
            ["IP Register access", isSuperAdmin ? "granted" : "restricted"],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
              <dd className="font-mono text-xs">{value}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </div>
  );
}
