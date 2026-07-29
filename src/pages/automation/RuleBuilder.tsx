import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  useAutomationRules,
  useSaveRule,
  useToggleRule,
  useDeleteRule,
  useSuggestAutomation,
  type AutomationRule,
} from "@/hooks/automation/use-automation";
import { Sparkles, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const DEFAULT_ACTIONS = JSON.stringify(
  [{ type: "notify", title: "Something happened", level: "medium" }],
  null,
  2,
);

const DEFAULT_CONDITIONS = JSON.stringify([], null, 2);

export default function RuleBuilder() {
  const rules = useAutomationRules();
  const save = useSaveRule();
  const toggle = useToggleRule();
  const del = useDeleteRule();
  const suggest = useSuggestAutomation();

  const [editing, setEditing] = useState<Partial<AutomationRule> | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState("ticket.signed");
  const [priority, setPriority] = useState(100);
  const [requireApproval, setRequireApproval] = useState(false);
  const [tags, setTags] = useState("");
  const [conditionsJson, setConditionsJson] = useState(DEFAULT_CONDITIONS);
  const [actionsJson, setActionsJson] = useState(DEFAULT_ACTIONS);
  const [aiPrompt, setAiPrompt] = useState("");

  function load(r: AutomationRule) {
    setEditing(r);
    setName(r.name);
    setDescription(r.description ?? "");
    setTrigger(r.trigger_event);
    setPriority(r.priority);
    setRequireApproval(r.require_approval);
    setTags((r.tags ?? []).join(", "));
    setConditionsJson(JSON.stringify(r.conditions ?? [], null, 2));
    setActionsJson(JSON.stringify(r.actions ?? [], null, 2));
  }

  function reset() {
    setEditing(null);
    setName("");
    setDescription("");
    setTrigger("ticket.signed");
    setPriority(100);
    setRequireApproval(false);
    setTags("");
    setConditionsJson(DEFAULT_CONDITIONS);
    setActionsJson(DEFAULT_ACTIONS);
  }

  async function handleSave() {
    let conditions: unknown, actions: unknown;
    try {
      conditions = JSON.parse(conditionsJson);
      actions = JSON.parse(actionsJson);
    } catch (e) {
      toast({ title: "Invalid JSON", description: (e as Error).message, variant: "destructive" });
      return;
    }
    if (!Array.isArray(actions)) {
      toast({ title: "Actions must be an array", variant: "destructive" });
      return;
    }
    await save.mutateAsync({
      id: editing?.id,
      name: name.trim(),
      description: description.trim() || null,
      trigger_event: trigger.trim(),
      priority,
      require_approval: requireApproval,
      tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
      conditions: conditions as Array<Record<string, unknown>>,
      actions: actions as Array<Record<string, unknown>>,
    });
    reset();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{editing ? "Edit rule" : "New rule"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Notify on ticket signed" />
            </div>
            <div>
              <Label className="text-xs">Trigger event</Label>
              <Input
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                placeholder="ticket.signed or *"
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Priority</Label>
              <Input type="number" value={priority} onChange={(e) => setPriority(parseInt(e.target.value, 10) || 100)} />
            </div>
            <div>
              <Label className="text-xs">Tags (comma-sep)</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="payroll, safety" />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={requireApproval} onCheckedChange={setRequireApproval} />
              <Label className="text-xs">Require approval</Label>
            </div>
          </div>

          <div>
            <Label className="text-xs">Conditions (JSON array)</Label>
            <Textarea
              rows={5}
              value={conditionsJson}
              onChange={(e) => setConditionsJson(e.target.value)}
              className="font-mono text-xs"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Each entry: <code>{`{ "field": "priority", "op": "eq", "value": "high" }`}</code>. Operators:{" "}
              <code>eq, neq, gt, lt, gte, lte, in, contains</code>.
            </p>
          </div>

          <div>
            <Label className="text-xs">Actions (JSON array)</Label>
            <Textarea
              rows={9}
              value={actionsJson}
              onChange={(e) => setActionsJson(e.target.value)}
              className="font-mono text-xs"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Types: <code>notify</code>, <code>create_task</code>, <code>emit_event</code>, <code>run_agent</code>,{" "}
              <code>call_webhook</code>.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            {editing && (
              <Button variant="ghost" onClick={reset}>
                Cancel
              </Button>
            )}
            <Button onClick={handleSave} disabled={!name.trim() || save.isPending}>
              {editing ? "Save changes" : "Create rule"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> WOIC suggest
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              rows={3}
              placeholder="Describe the workflow you want, e.g. 'notify dispatch when a certification expires in 14 days'"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
            />
            <Button
              className="w-full"
              variant="outline"
              onClick={() => suggest.run(aiPrompt)}
              disabled={suggest.loading || !aiPrompt.trim()}
            >
              {suggest.loading ? "Thinking…" : "Suggest automation"}
            </Button>
            {suggest.suggestion && (
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-muted p-3 text-xs">
                {suggest.suggestion}
              </pre>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">All rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(rules.data ?? []).map((r) => (
              <div key={r.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <button className="truncate text-left font-medium hover:underline" onClick={() => load(r)}>
                        {r.name}
                      </button>
                      <Badge variant="outline" className="text-[10px]">
                        v{r.version}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                      <code className="rounded bg-muted px-1">{r.trigger_event}</code>
                      <span>· {r.actions.length} actions</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={r.enabled}
                      onCheckedChange={(v) => toggle.mutate({ id: r.id, enabled: v })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Delete "${r.name}"?`)) del.mutate(r.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {rules.data && rules.data.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">No rules yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
