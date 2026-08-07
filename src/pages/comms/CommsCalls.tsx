import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Phone, PhoneIncoming, PhoneOutgoing, Sparkles, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ASSISTANT_TASKS } from "@/lib/comms/fabric";
import { useCommAssistant, useCommsWorkspace, useCreateCommTask, type CommCall } from "@/hooks/comms/use-comms";
import { toast } from "@/hooks/use-toast";

export default function CommsCalls() {
  const { state, update } = useCommsWorkspace();
  const assistant = useCommAssistant();
  const createTask = useCreateCommTask();
  const [contact, setContact] = useState("");
  const [direction, setDirection] = useState<"inbound" | "outbound">("outbound");
  const [duration, setDuration] = useState("15");
  const [notes, setNotes] = useState("");
  const [summary, setSummary] = useState("");

  const log = () => {
    if (!contact.trim()) return;
    const call: CommCall = {
      id: crypto.randomUUID(),
      contact: contact.trim(),
      direction,
      at: new Date().toISOString(),
      duration_min: Number(duration) || 0,
      notes: notes.trim(),
    };
    update({ calls: [call, ...state.calls].slice(0, 200) });
    setContact(""); setNotes(""); setSummary("");
    toast({ title: "Call logged" });
  };

  const summarize = (call: CommCall) => {
    assistant.mutate(
      { task: ASSISTANT_TASKS.find((t) => t.key === "actions")!, context: `Call with ${call.contact} (${call.direction}, ${call.duration_min} min):\n${call.notes}` },
      { onSuccess: (r) => setSummary(r.text) },
    );
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4" /> Log a call</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Who did you speak with?" />
          <div className="flex gap-2">
            <select value={direction} onChange={(e) => setDirection(e.target.value as "inbound" | "outbound")} className="h-9 flex-1 rounded-md border bg-background px-2 text-sm">
              <option value="outbound">Outbound</option>
              <option value="inbound">Inbound</option>
            </select>
            <Input value={duration} onChange={(e) => setDuration(e.target.value)} type="number" min="0" className="w-24" placeholder="Min" />
          </div>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Call notes…" className="min-h-[120px]" />
          <Button className="w-full" onClick={log} disabled={!contact.trim()}>Save call log</Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Call history</CardTitle></CardHeader>
          <CardContent className="divide-y p-0">
            {state.calls.map((c) => (
              <div key={c.id} className="flex items-start gap-3 px-4 py-3">
                {c.direction === "inbound"
                  ? <PhoneIncoming className="mt-0.5 h-4 w-4 text-primary" />
                  : <PhoneOutgoing className="mt-0.5 h-4 w-4 text-muted-foreground" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{c.contact}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(c.at), "PP p")} · {c.duration_min} min
                  </p>
                  {c.notes && <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{c.notes}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-xs" disabled={assistant.isPending} onClick={() => summarize(c)}>
                    {assistant.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() =>
                      createTask.mutate(
                        { title: `Follow up: ${c.contact}`, description: c.notes, priority: "medium" },
                        { onSuccess: () => toast({ title: "Follow-up task created" }) },
                      )
                    }
                  >
                    Follow up
                  </Button>
                </div>
              </div>
            ))}
            {!state.calls.length && <p className="p-6 text-sm text-muted-foreground">No calls logged yet.</p>}
          </CardContent>
        </Card>

        {summary && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">AI call analysis</CardTitle></CardHeader>
            <CardContent>
              <Badge variant="secondary" className="mb-2 text-[10px]">Action items</Badge>
              <p className="whitespace-pre-wrap text-sm">{summary}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
