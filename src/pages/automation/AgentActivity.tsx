import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useAgentRuns, useAutomationAgents, useSaveAgent } from "@/hooks/automation/use-automation";
import { formatDistanceToNow } from "date-fns";

export default function AgentActivity() {
  const agents = useAutomationAgents();
  const runs = useAgentRuns(50);
  const save = useSaveAgent();

  const [name, setName] = useState("");
  const [role, setRole] = useState("recruiter");
  const [prompt, setPrompt] = useState("You are a helpful recruiting assistant that scores candidates against job orders.");
  const [enabled, setEnabled] = useState(true);

  async function handleCreate() {
    if (!name.trim()) return;
    await save.mutateAsync({ name: name.trim(), role: role.trim(), system_prompt: prompt, enabled });
    setName("");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New AI agent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Recruiting Agent" />
            </div>
            <div>
              <Label className="text-xs">Role</Label>
              <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="recruiter | compliance | scheduling | payroll | executive" />
            </div>
            <div>
              <Label className="text-xs">System prompt</Label>
              <Textarea rows={5} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={enabled} onCheckedChange={setEnabled} />
              <Label className="text-xs">Enabled</Label>
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={!name.trim() || save.isPending}>
              Create agent
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registered agents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(agents.data ?? []).map((a) => (
              <div key={a.id} className="rounded border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{a.name}</span>
                      <Badge variant="outline">{a.role}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{a.model}</div>
                  </div>
                  <Badge variant={a.enabled ? "default" : "outline"}>{a.enabled ? "on" : "off"}</Badge>
                </div>
              </div>
            ))}
            {agents.data && agents.data.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">No agents yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agent execution history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(runs.data ?? []).map((r) => (
            <div key={r.id} className="rounded border p-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === "succeeded" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>
                    {r.status}
                  </Badge>
                  <code className="font-mono text-xs text-muted-foreground">{r.agent_id.slice(0, 8)}</code>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                </span>
              </div>
              {r.error && <div className="mt-2 rounded bg-red-50 p-2 text-xs text-red-800">{r.error}</div>}
              {r.output && (
                <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted p-2 text-xs">
                  {JSON.stringify(r.output, null, 2)}
                </pre>
              )}
            </div>
          ))}
          {runs.data && runs.data.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No agent runs yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
