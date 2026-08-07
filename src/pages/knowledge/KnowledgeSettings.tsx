import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useKnowledgeWorkspaceState } from "@/hooks/knowledge/use-knowledge";

const toggles = [
  { key: "aiSuggestions", label: "AI knowledge suggestions", hint: "Surface WOIC recommendations while browsing." },
  { key: "showArchived", label: "Show archived knowledge", hint: "Include archived items in library lists." },
  { key: "compactRows", label: "Compact list density", hint: "Tighter rows for large corpora." },
  { key: "autoTrackRecents", label: "Track recently viewed", hint: "Store viewed articles locally for quick access." },
] as const;

export default function KnowledgeSettings() {
  const ws = useKnowledgeWorkspaceState();

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
              <Switch
                id={t.key}
                checked={ws.prefs[t.key]}
                onCheckedChange={(v) => ws.setPref(t.key, v)}
              />
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
