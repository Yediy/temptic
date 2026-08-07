import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Settings2, RotateCcw } from "lucide-react";
import { CHANNELS, CONVERSATION_SCOPES } from "@/lib/comms/fabric";
import { useCommsWorkspace } from "@/hooks/comms/use-comms";
import { toast } from "@/hooks/use-toast";

export default function CommsSettings() {
  const { state, setSettings, reset } = useCommsWorkspace();
  const s = state.settings;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm"><Settings2 className="h-4 w-4" /> Workspace preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm">Compact density</Label>
              <p className="text-xs text-muted-foreground">Tighter rows in the unified inbox.</p>
            </div>
            <Switch
              checked={s.density === "compact"}
              onCheckedChange={(v) => setSettings({ density: v ? "compact" : "comfortable" })}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm">Show system events</Label>
              <p className="text-xs text-muted-foreground">Include fabric events alongside messages and notifications.</p>
            </div>
            <Switch checked={s.showEvents} onCheckedChange={(v) => setSettings({ showEvents: v })} />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm">Desktop notifications</Label>
              <p className="text-xs text-muted-foreground">Ask the browser to surface critical alerts.</p>
            </div>
            <Switch
              checked={s.desktopNotifications}
              onCheckedChange={async (v) => {
                if (v && "Notification" in window) {
                  const perm = await Notification.requestPermission();
                  if (perm !== "granted") { toast({ title: "Permission denied by the browser" }); return; }
                }
                setSettings({ desktopNotifications: v });
              }}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-sm">Digest frequency</Label>
            <select
              value={s.digest}
              onChange={(e) => setSettings({ digest: e.target.value as typeof s.digest })}
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
            >
              <option value="off">Off</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-sm">Escalate unanswered after (hours)</Label>
            <Input
              type="number"
              min="1"
              value={s.escalateAfterHours}
              onChange={(e) => setSettings({ escalateAfterHours: Number(e.target.value) || 1 })}
            />
          </div>

          <Button variant="outline" onClick={() => { reset(); toast({ title: "Workspace preferences reset" }); }}>
            <RotateCcw className="mr-1.5 h-4 w-4" /> Reset workspace
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Muted channels</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {CHANNELS.map((c) => {
              const muted = s.mutedChannels.includes(c.key);
              return (
                <Button
                  key={c.key}
                  size="sm"
                  variant={muted ? "secondary" : "outline"}
                  className="h-7 text-xs"
                  onClick={() =>
                    setSettings({
                      mutedChannels: muted ? s.mutedChannels.filter((x) => x !== c.key) : [...s.mutedChannels, c.key],
                    })
                  }
                >
                  {c.label}{muted ? " · muted" : ""}
                </Button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Supported conversation types</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {CONVERSATION_SCOPES.map((sc) => (
              <Badge key={sc.key} variant="outline" className="text-xs" title={sc.hint}>{sc.label}</Badge>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
