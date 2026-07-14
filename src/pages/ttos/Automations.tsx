import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

type Auto = {
  id: string;
  name: string;
  description: string | null;
  trigger_event: string;
  actions: Array<Record<string, unknown>>;
  enabled: boolean;
  priority: number;
};

export default function Automations() {
  const { agencyId } = useAuth();
  const [rows, setRows] = useState<Auto[]>([]);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("ticket.signed");
  const [actionsJson, setActionsJson] = useState(
    JSON.stringify([{ type: "notify", title: "Ticket signed", level: "medium" }], null, 2),
  );

  async function load() {
    if (!agencyId) return;
    const { data } = await supabase.from("ttos_automations").select("*").eq("agency_id", agencyId).order("priority");
    setRows((data ?? []) as Auto[]);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [agencyId]);

  async function create() {
    if (!agencyId || !name.trim()) return;
    let actions: unknown;
    try { actions = JSON.parse(actionsJson); }
    catch (e) { toast({ title: "Invalid JSON", description: (e as Error).message, variant: "destructive" }); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any;
    const { error } = await client.from("ttos_automations").insert({
      agency_id: agencyId,
      name: name.trim(),
      trigger_event: trigger.trim(),
      actions,
    });
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setName(""); load();
  }

  async function toggle(id: string, enabled: boolean) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("ttos_automations").update({ enabled }).eq("id", id);
    load();
  }

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">Automations</h1>

      <Card>
        <CardHeader><CardTitle>New automation</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Trigger event (e.g. ticket.signed or *)" value={trigger} onChange={(e) => setTrigger(e.target.value)} />
          <div>
            <label className="text-xs text-muted-foreground">Actions (JSON array)</label>
            <Textarea rows={8} value={actionsJson} onChange={(e) => setActionsJson(e.target.value)} className="font-mono text-xs" />
            <p className="mt-1 text-xs text-muted-foreground">
              Supported action types: <code>notify</code>, <code>create_task</code>, <code>emit_event</code>.
            </p>
          </div>
          <Button onClick={create} disabled={!name.trim()}>Create</Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {rows.map((a) => (
          <Card key={a.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{a.name}</span>
                  <Badge variant="outline">{a.trigger_event}</Badge>
                  <Badge>{a.actions.length} actions</Badge>
                </div>
                {a.description && <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>}
              </div>
              <Switch checked={a.enabled} onCheckedChange={(v) => toggle(a.id, v)} />
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No automations yet.</p>}
      </div>
    </div>
  );
}
