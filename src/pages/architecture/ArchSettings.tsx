import { Panel } from "@/components/architecture/ArchBits";
import { useArchPermissions, useArchSettings } from "@/hooks/architecture/use-architecture";
import {
  ARCHITECTURE_VERSION, CAPABILITY_SPEC, CONSTITUTION_VERSION, PLATFORM_CONTRACT, PLATFORM_DNA,
} from "@/lib/architecture/platform";

export default function ArchSettings() {
  const [settings, setSettings] = useArchSettings();
  const { roles, isSuperAdmin } = useArchPermissions();

  const toggle = (key: "showRegistryIds" | "showPendingCapabilities" | "engineeringMode") => (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={Boolean(settings[key])}
        onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })}
        className="h-4 w-4 rounded border"
      />
      <span>
        {key === "showRegistryIds" && "Show canonical registry ids in tables"}
        {key === "showPendingCapabilities" && "Show capabilities the registry has not implemented"}
        {key === "engineeringMode" && "Engineering mode (raw registry payloads)"}
      </span>
    </label>
  );

  return (
    <div className="space-y-3">
      <Panel title="Console Preferences" description="Local display preferences. Nothing here changes the Architecture Registry.">
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="w-24 text-muted-foreground">Density</span>
            <select
              value={settings.density}
              onChange={(e) => setSettings({ ...settings, density: e.target.value as typeof settings.density })}
              className="h-8 rounded-md border bg-background px-2 text-xs"
            >
              <option value="comfortable">Comfortable</option>
              <option value="dense">Dense</option>
            </select>
          </label>
          {toggle("showRegistryIds")}
          {toggle("showPendingCapabilities")}
          {toggle("engineeringMode")}
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
