import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DEFAULT_TIMELINE_SETTINGS, useTimelineSettings } from "@/hooks/timeline/use-timeline";

export default function TimelineSettingsPage() {
  const { settings, setSettings } = useTimelineSettings();

  return (
    <Card className="max-w-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Timeline settings</CardTitle>
        <p className="text-xs text-muted-foreground">
          Layout preferences persist on this device and apply to every timeline scope.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <Row label="Dense rows" hint="High information density for large screens.">
          <Switch
            checked={settings.density === "dense"}
            onCheckedChange={(v) => setSettings((s) => ({ ...s, density: v ? "dense" : "comfortable" }))}
          />
        </Row>
        <Row label="Group by day" hint="Show sticky day headers in the feed.">
          <Switch
            checked={settings.grouping === "day"}
            onCheckedChange={(v) => setSettings((s) => ({ ...s, grouping: v ? "day" : "none" }))}
          />
        </Row>
        <Row label="Auto refresh" hint="Keep timelines in sync with the engine.">
          <Switch
            checked={settings.autoRefresh}
            onCheckedChange={(v) => setSettings((s) => ({ ...s, autoRefresh: v }))}
          />
        </Row>
        <Row label="Show AI panel" hint="WOIC summaries, anomalies and predictions.">
          <Switch
            checked={settings.showAiPanel}
            onCheckedChange={(v) => setSettings((s) => ({ ...s, showAiPanel: v }))}
          />
        </Row>
        <Row label="Show analytics" hint="Operational metrics beside the feed.">
          <Switch
            checked={settings.showAnalytics}
            onCheckedChange={(v) => setSettings((s) => ({ ...s, showAnalytics: v }))}
          />
        </Row>
        <Row label="Default fetch size" hint="Maximum events requested per scope (100–2000).">
          <Input
            type="number"
            min={100}
            max={2000}
            className="w-28"
            value={settings.defaultLimit}
            onChange={(e) =>
              setSettings((s) => ({ ...s, defaultLimit: Math.min(2000, Math.max(100, Number(e.target.value) || 500)) }))
            }
          />
        </Row>

        <Button variant="outline" onClick={() => setSettings(DEFAULT_TIMELINE_SETTINGS)}>
          Restore defaults
        </Button>
      </CardContent>
    </Card>
  );
}

function Row({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <Label className="text-sm">{label}</Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {children}
    </div>
  );
}
