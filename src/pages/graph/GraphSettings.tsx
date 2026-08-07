import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  DEFAULT_SETTINGS, SETTINGS_KEY, VISUALIZATION_MODES, readJson, writeJson, type ExplorerSettings,
} from "@/lib/graph/platform";

export default function GraphSettings() {
  const [settings, setSettings] = useState<ExplorerSettings>(() => readJson(SETTINGS_KEY, DEFAULT_SETTINGS));

  const save = () => {
    writeJson(SETTINGS_KEY, settings);
    toast({ title: "Explorer settings saved", description: "Applied to every graph surface on this device." });
  };

  return (
    <Card className="max-w-xl bg-card/60 backdrop-blur">
      <CardHeader className="pb-2"><CardTitle className="text-sm">Explorer settings</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="limit">Node limit per projection</Label>
          <Input id="limit" type="number" min={50} max={2000} step={50} value={settings.nodeLimit}
            onChange={(e) => setSettings((s) => ({ ...s, nodeLimit: Number(e.target.value) || 500 }))} />
          <p className="text-[11px] text-muted-foreground">
            Larger graphs load progressively; the renderer virtualizes labels above 1× zoom.
          </p>
        </div>

        <div className="space-y-1">
          <Label htmlFor="mode">Default visualization mode</Label>
          <select id="mode" value={settings.defaultMode}
            onChange={(e) => setSettings((s) => ({ ...s, defaultMode: e.target.value }))}
            className="h-9 w-full rounded-md border bg-background px-2 text-sm">
            {VISUALIZATION_MODES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="labels">Show node labels</Label>
          <Switch id="labels" checked={settings.labels}
            onCheckedChange={(v) => setSettings((s) => ({ ...s, labels: v }))} />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="progressive">Progressive loading</Label>
          <Switch id="progressive" checked={settings.progressive}
            onCheckedChange={(v) => setSettings((s) => ({ ...s, progressive: v }))} />
        </div>

        <Button size="sm" onClick={save}>Save settings</Button>
      </CardContent>
    </Card>
  );
}
