import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useKnowledgeWorkspaceState } from "@/hooks/knowledge/use-knowledge";

export default function KnowledgeSettings() {
  const ws = useKnowledgeWorkspaceState();

  const toggles = [
    {
      key: "showAiPanel" as const,
      label: "AI knowledge assistant",
      hint: "Show the WOIC assistant panel inside the article viewer.",
      checked: ws.settings.showAiPanel,
      onChange: (v: boolean) => ws.updateSettings({ showAiPanel: v }),
    },
    {
      key: "density" as const,
      label: "Compact list density",
      hint: "Tighter rows for large knowledge corpora.",
      checked: ws.settings.density === "compact",
      onChange: (v: boolean) => ws.updateSettings({ density: v ? "compact" : "comfortable" }),
    },
    {
      key: "dark" as const,
      label: "Dark-first workspace surfaces",
      hint: "Use the mission-control dark styling for knowledge panels.",
      checked: ws.settings.dark,
      onChange: (v: boolean) => ws.updateSettings({ dark: v }),
    },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Workspace preferences</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {toggles.map((t) => (
            <div key={t.key} className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor={t.key} className="text-sm">{t.label}</Label>
                <p className="text-xs text-muted-foreground">{t.hint}</p>
              </div>
              <Switch id={t.key} checked={t.checked} onCheckedChange={t.onChange} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Local workspace data</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Bookmarks, annotations, collections, saved searches and recents are stored on this device only.
            Knowledge content, versions, permissions and approvals live in the Knowledge Intelligence Engine.
          </p>
          <div className="flex flex-wrap gap-2">
            <span>{ws.bookmarks.length} bookmarks</span>·
            <span>{ws.collections.length} collections</span>·
            <span>{ws.savedSearches.length} saved searches</span>·
            <span>{ws.recents.length} recents</span>
          </div>
          <Button variant="outline" size="sm" onClick={ws.resetWorkspace}>Reset local workspace data</Button>
        </CardContent>
      </Card>
    </div>
  );
}
