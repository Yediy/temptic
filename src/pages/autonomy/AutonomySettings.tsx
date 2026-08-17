import { CapabilityState, ContractChips, Panel } from "@/components/autonomy/AutoBits";
import { useAutonomyPermissions, useAutonomySettings, useCapability } from "@/hooks/autonomy/use-autonomy";
import {
  ARCHITECTURE_VERSION, AUTONOMY_ENGINE_FUNCTION, CAPABILITIES, CAPABILITY_SPEC, CONSTITUTION_VERSION,
  PLATFORM_CONTRACT, PLATFORM_DNA, WORKSPACE_MODES,
} from "@/lib/autonomy/platform";
import { Badge } from "@/components/ui/badge";

export default function AutonomySettings() {
  const [settings, setSettings] = useAutonomySettings();
  const { canEngineering, can } = useAutonomyPermissions();
  const health = useCapability<Record<string, unknown>>("operations.overview", {}, { enabled: canEngineering });

  return (
    <div className="space-y-4">
      <Panel title="Workspace preferences" description="Layout preferences are stored on this device only.">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="text-xs text-muted-foreground">Default mode</span>
            <select value={settings.mode} className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
              onChange={(e) => setSettings({ ...settings, mode: e.target.value as typeof settings.mode })}>
              {WORKSPACE_MODES.filter((m) => m.key !== "engineering" || canEngineering)
                .map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-xs text-muted-foreground">Live refresh</span>
            <select value={settings.refreshMs} className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
              onChange={(e) => setSettings({ ...settings, refreshMs: Number(e.target.value) })}>
              {[5000, 10000, 15000, 30000, 60000].map((v) => <option key={v} value={v}>{v / 1000}s</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-xs text-muted-foreground">Density</span>
            <select value={settings.density} className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
              onChange={(e) => setSettings({ ...settings, density: e.target.value as typeof settings.density })}>
              <option value="dense">Dense</option>
              <option value="comfortable">Comfortable</option>
            </select>
          </label>
        </div>
      </Panel>

      <Panel title="Engineering Mode" description="Read-only platform identity and integration surface.">
        {!canEngineering ? (
          <p className="text-sm text-muted-foreground">Engineering Mode requires an explicitly authorized identity.</p>
        ) : (
          <div className="space-y-3 text-sm">
            <ContractChips />
            <dl className="grid gap-1 text-xs md:grid-cols-2">
              {[
                ["Architecture version", ARCHITECTURE_VERSION],
                ["Constitution version", CONSTITUTION_VERSION],
                ["Platform contract", PLATFORM_CONTRACT],
                ["Capability specification", CAPABILITY_SPEC],
                ["Platform DNA", PLATFORM_DNA],
                ["Engine endpoint", AUTONOMY_ENGINE_FUNCTION],
              ].map(([l, v]) => (
                <div key={l} className="flex gap-2">
                  <dt className="w-44 shrink-0 text-muted-foreground">{l}</dt>
                  <dd className="font-mono">{v}</dd>
                </div>
              ))}
            </dl>

            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">API integration matrix</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-2 py-1">Capability</th><th className="px-2 py-1">Engine method</th>
                      <th className="px-2 py-1">Mutating</th><th className="px-2 py-1">Permitted for you</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CAPABILITIES.map((c) => (
                      <tr key={c.key} className="border-b last:border-0">
                        <td className="px-2 py-1 font-mono">{c.key}</td>
                        <td className="px-2 py-1 font-mono">{c.method}</td>
                        <td className="px-2 py-1">{c.mutating ? "yes" : "no"}</td>
                        <td className="px-2 py-1">
                          <Badge variant="outline" className="text-[10px]">{can(c.key) ? "allowed" : "denied"}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Engine health signal</p>
              <CapabilityState status={health.status} message={health.message} label="engine health">
                <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-2 text-[11px]">
                  {JSON.stringify(health.data, null, 2)}
                </pre>
              </CapabilityState>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Engineering Mode is read-only. Platform DNA, contracts and capability specifications are modified only
              through an authorized governance surface.
            </p>
          </div>
        )}
      </Panel>
    </div>
  );
}
