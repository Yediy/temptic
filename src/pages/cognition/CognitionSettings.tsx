import { Panel } from "@/components/cognition/CogBits";
import { useCognitionPermissions, useCognitionSettings } from "@/hooks/cognition/use-cognition";
import { CAPABILITIES, WORKSPACE_MODES } from "@/lib/cognition/platform";

export default function CognitionSettings() {
  const [settings, setSettings] = useCognitionSettings();
  const { roles, can } = useCognitionPermissions();

  return (
    <div className="space-y-4">
      <Panel title="Workspace Settings" description="Stored locally in this browser. No cognitive behaviour is configured here.">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium">Default mode</span>
            <select
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={settings.mode}
              onChange={(e) => setSettings({ ...settings, mode: e.target.value as typeof settings.mode })}
            >
              {WORKSPACE_MODES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium">Refresh interval</span>
            <select
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={settings.refreshMs}
              onChange={(e) => setSettings({ ...settings, refreshMs: Number(e.target.value) })}
            >
              {[10000, 20000, 30000, 60000, 0].map((ms) => (
                <option key={ms} value={ms}>{ms === 0 ? "Manual only" : `${ms / 1000}s`}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium">Table density</span>
            <select
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={settings.density}
              onChange={(e) => setSettings({ ...settings, density: e.target.value as typeof settings.density })}
            >
              <option value="dense">Dense</option>
              <option value="comfortable">Comfortable</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium">Rows per page</span>
            <select
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={settings.pageSize}
              onChange={(e) => setSettings({ ...settings, pageSize: Number(e.target.value) })}
            >
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={settings.showPlannedFaculties}
              onChange={(e) => setSettings({ ...settings, showPlannedFaculties: e.target.checked })}
            />
            Show PLANNED faculties in the registry (always labelled as not operational)
          </label>
        </div>
      </Panel>

      <Panel title="Permission Map" description="What your identity may request from the Cognitive Control API.">
        <p className="mb-2 text-xs text-muted-foreground">Roles: {roles.length ? roles.join(", ") : "none"}</p>
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {CAPABILITIES.map((c) => (
            <li key={c.key} className="flex items-center justify-between gap-2 rounded border px-2 py-1">
              <span className="truncate">{c.label}</span>
              <span className={can(c.key) ? "text-xs text-emerald-400" : "text-xs text-muted-foreground"}>
                {can(c.key) ? "permitted" : "not permitted"}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Client-side permission checks only hide controls. Authorization is enforced by the Cognitive Control API.
        </p>
      </Panel>
    </div>
  );
}
