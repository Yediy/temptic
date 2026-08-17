import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useOptSettings, useOptimizationPermissions } from "@/hooks/optimization/use-optimization";
import { OPTIMIZATION_MODES, PLATFORM_DNA, TIME_HORIZONS, type TimeHorizon } from "@/lib/optimization/platform";

export default function OptimizationSettings() {
  const [settings, setSettings] = useOptSettings();
  const { caps } = useOptimizationPermissions();

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Workspace preferences</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-xs">
          <label className="flex items-center justify-between gap-2">
            Default optimization mode
            <select value={settings.defaultMode} aria-label="Default mode" className="h-8 rounded border bg-background px-2"
              onChange={(e) => setSettings({ ...settings, defaultMode: e.target.value })}>
              {OPTIMIZATION_MODES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </label>
          <label className="flex items-center justify-between gap-2">
            Default horizon
            <select value={settings.defaultHorizon} aria-label="Default horizon" className="h-8 rounded border bg-background px-2"
              onChange={(e) => setSettings({ ...settings, defaultHorizon: e.target.value as TimeHorizon })}>
              {TIME_HORIZONS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </label>
          <label className="flex items-center justify-between gap-2">
            Minimum confidence to surface a strategy ({(settings.confidenceThreshold * 100).toFixed(0)}%)
            <input type="range" min={0} max={1} step={0.05} value={settings.confidenceThreshold} className="w-40"
              onChange={(e) => setSettings({ ...settings, confidenceThreshold: Number(e.target.value) })} />
          </label>
          <label className="flex items-center justify-between gap-2">
            Show raw engine output
            <Switch checked={settings.showRawOutput} onCheckedChange={(v) => setSettings({ ...settings, showRawOutput: v })} />
          </label>
          <label className="flex items-center justify-between gap-2">
            Show solver metadata
            <Switch checked={settings.showSolverMetadata} onCheckedChange={(v) => setSettings({ ...settings, showSolverMetadata: v })} />
          </label>
          <label className="flex items-center justify-between gap-2">
            History row limit
            <input type="number" min={25} max={500} step={25} value={settings.rowLimit} aria-label="History row limit"
              className="h-8 w-24 rounded border bg-background px-2"
              onChange={(e) => setSettings({ ...settings, rowLimit: Number(e.target.value) })} />
          </label>
          <p className="text-muted-foreground">
            Approval before execution is constitutionally locked. The workspace never executes a strategy; it only routes it to
            Decision Intelligence.
          </p>
          <label className="flex items-center justify-between gap-2">
            Presentation mode
            <select value={settings.view} aria-label="Presentation mode" className="h-8 rounded border bg-background px-2"
              onChange={(e) => setSettings({ ...settings, view: e.target.value as "executive" | "analyst" })}>
              <option value="executive">Executive</option>
              <option value="analyst">Analyst</option>
            </select>
          </label>
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Platform DNA & authority</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(PLATFORM_DNA).map(([k, v]) => (
              <div key={k} className="rounded border p-1.5">
                <p className="text-[10px] uppercase text-muted-foreground">{k.replace(/_/g, " ")}</p>
                <p className="truncate">{Array.isArray(v) ? v.join(", ") : String(v)}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="mb-1 font-medium">Your capabilities</p>
            <div className="flex flex-wrap gap-1">
              {caps.size ? Array.from(caps).map((c) => <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>)
                : <span className="text-muted-foreground">Read-only access.</span>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
