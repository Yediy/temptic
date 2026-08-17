import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  useArchivedSimulations, useCalibrationLog, useSavedResults, useSavedScenarios,
  useSimSettings, useSimulationPermissions,
} from "@/hooks/simulation/use-simulation";
import {
  DEFAULT_SIM_SETTINGS, PLATFORM_DNA, SIMULATION_MODES, TIME_HORIZONS,
} from "@/lib/simulation/platform";
import { useToast } from "@/hooks/use-toast";

export default function SimulationSettings() {
  const [settings, setSettings] = useSimSettings();
  const [scenarios, setScenarios] = useSavedScenarios();
  const [saved, setSaved] = useSavedResults();
  const [archived, setArchived] = useArchivedSimulations();
  const [calibration, setCalibration] = useCalibrationLog();
  const permissions = useSimulationPermissions();
  const { toast } = useToast();

  const patch = (p: Partial<typeof settings>) => setSettings({ ...settings, ...p });

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Simulation defaults</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <label className="flex items-center justify-between gap-2">
            Default scenario type
            <select value={settings.defaultMode} onChange={(e) => patch({ defaultMode: e.target.value })}
              className="h-9 rounded-md border bg-background px-2 text-sm">
              {SIMULATION_MODES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </label>
          <label className="flex items-center justify-between gap-2">
            Default time horizon
            <select value={settings.defaultHorizon} onChange={(e) => patch({ defaultHorizon: e.target.value })}
              className="h-9 rounded-md border bg-background px-2 text-sm">
              {TIME_HORIZONS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </label>
          <label className="block text-xs text-muted-foreground">
            Confidence threshold ({settings.confidenceThreshold.toFixed(2)}) — results below this are flagged low-confidence
            <input type="range" min={0} max={1} step={0.05} value={settings.confidenceThreshold}
              onChange={(e) => patch({ confidenceThreshold: Number(e.target.value) })} className="w-full" />
          </label>
          <label className="block text-xs text-muted-foreground">
            Impact map node limit ({settings.graphNodeLimit})
            <input type="range" min={50} max={1000} step={50} value={settings.graphNodeLimit}
              onChange={(e) => patch({ graphNodeLimit: Number(e.target.value) })} className="w-full" />
          </label>
          <div className="flex items-center justify-between gap-2">
            <span>Show raw engine output</span>
            <Switch checked={settings.showRawOutput} onCheckedChange={(v) => patch({ showRawOutput: v })} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>Executive presentation mode</span>
            <Switch checked={settings.view === "executive"}
              onCheckedChange={(v) => patch({ view: v ? "executive" : "analyst" })} />
          </div>
          <Button size="sm" variant="outline" onClick={() => { setSettings(DEFAULT_SIM_SETTINGS); toast({ title: "Defaults restored" }); }}>
            Restore defaults
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Access</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-1">
            {["run", "compare", "approve", "calibrate", "export"].map((c) => (
              <Badge key={c} variant={permissions.has(c as never) ? "secondary" : "outline"} className="text-[10px]">
                {c}: {permissions.has(c as never) ? "allowed" : "restricted"}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Local workspace data</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <p className="text-muted-foreground">
              {scenarios.length} saved scenarios · {saved.length} pinned results · {archived.length} archived · {calibration.length} calibration records
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setScenarios([])}>Clear scenarios</Button>
              <Button size="sm" variant="outline" onClick={() => setSaved([])}>Clear pinned</Button>
              <Button size="sm" variant="outline" onClick={() => setArchived([])}>Clear archive</Button>
              <Button size="sm" variant="outline" onClick={() => setCalibration([])}>Clear calibration</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Platform DNA</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-xs text-muted-foreground">
            <p>Architecture: {PLATFORM_DNA.architecture_version}</p>
            <p>Engine: {PLATFORM_DNA.engine}</p>
            <p>Production data is never mutated by simulations.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
