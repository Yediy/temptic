import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_at: string | null;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
};

export default function Tasks() {
  const { agencyId } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<"open" | "done" | "all">("open");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState("medium");

  async function load() {
    if (!agencyId) return;
    let q = supabase.from("ttos_tasks").select("*").eq("agency_id", agencyId).order("created_at", { ascending: false });
    if (filter === "open") q = q.eq("status", "open");
    if (filter === "done") q = q.eq("status", "done");
    const { data } = await q;
    setTasks((data ?? []) as Task[]);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [agencyId, filter]);

  async function create() {
    if (!agencyId || !title.trim()) return;
    const { error } = await supabase.from("ttos_tasks").insert({
      agency_id: agencyId,
      title: title.trim(),
      description: desc.trim() || null,
      priority,
    });
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setTitle(""); setDesc(""); setPriority("medium"); load();
  }

  async function complete(id: string) {
    await supabase.from("ttos_tasks").update({ status: "done", completed_at: new Date().toISOString() }).eq("id", id);
    load();
  }

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">Tasks</h1>

      <Card>
        <CardHeader><CardTitle>New task</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <div className="flex items-center gap-3">
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={create} disabled={!title.trim()}>Create</Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {(["open", "done", "all"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
            {f}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        {tasks.map((t) => (
          <Card key={t.id}>
            <CardContent className="flex items-start justify-between gap-4 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t.title}</span>
                  <Badge variant="outline">{t.priority}</Badge>
                  <Badge>{t.status}</Badge>
                </div>
                {t.description && <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>}
              </div>
              {t.status === "open" && (
                <Button size="sm" variant="outline" onClick={() => complete(t.id)}>Complete</Button>
              )}
            </CardContent>
          </Card>
        ))}
        {tasks.length === 0 && <p className="text-sm text-muted-foreground">No tasks.</p>}
      </div>
    </div>
  );
}
