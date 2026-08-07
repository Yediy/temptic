import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LayoutTemplate, Plus, Trash2, Sparkles, Loader2 } from "lucide-react";
import { CHANNELS, ASSISTANT_TASKS, type CommChannel } from "@/lib/comms/fabric";
import { useCommAssistant, useCommsWorkspace, type CommTemplate } from "@/hooks/comms/use-comms";
import { toast } from "@/hooks/use-toast";

export default function CommsTemplates() {
  const { state, update } = useCommsWorkspace();
  const assistant = useCommAssistant();
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<CommChannel>("internal");
  const [body, setBody] = useState("");

  const save = () => {
    if (!name.trim() || !body.trim()) return;
    const tpl: CommTemplate = { id: crypto.randomUUID(), name: name.trim(), channel, body: body.trim() };
    update({ templates: [tpl, ...state.templates] });
    setName(""); setBody("");
    toast({ title: "Template saved" });
  };

  const generate = () => {
    assistant.mutate(
      {
        task: ASSISTANT_TASKS.find((t) => t.key === "draft")!,
        context: `Create a reusable ${channel} message template named "${name || "Untitled"}". Use {{placeholders}} for variables. Notes: ${body}`,
      },
      { onSuccess: (r) => setBody(r.text) },
    );
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm"><LayoutTemplate className="h-4 w-4" /> New template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" />
          <select value={channel} onChange={(e) => setChannel(e.target.value as CommChannel)} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
            {CHANNELS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Body — use {{name}}, {{date}}, {{site}}…" className="min-h-[180px]" />
          <div className="flex gap-2">
            <Button className="flex-1" onClick={save} disabled={!name.trim() || !body.trim()}>
              <Plus className="mr-1.5 h-4 w-4" /> Save
            </Button>
            <Button variant="outline" onClick={generate} disabled={assistant.isPending}>
              {assistant.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Template library</CardTitle></CardHeader>
        <CardContent className="divide-y p-0">
          {state.templates.map((t) => (
            <div key={t.id} className="flex items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{t.name}</p>
                  <Badge variant="outline" className="text-[9px] uppercase">{t.channel}</Badge>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{t.body}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => { navigator.clipboard?.writeText(t.body); toast({ title: "Copied to clipboard" }); }}
                >
                  Copy
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => update({ templates: state.templates.filter((x) => x.id !== t.id) })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {!state.templates.length && <p className="p-6 text-sm text-muted-foreground">No templates yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
