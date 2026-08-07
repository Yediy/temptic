import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Video, Sparkles, Loader2, CalendarClock } from "lucide-react";
import { format } from "date-fns";
import { ASSISTANT_TASKS } from "@/lib/comms/fabric";
import { useCommAssistant, useCommsWorkspace, useCreateCommTask, type CommMeeting } from "@/hooks/comms/use-comms";
import { toast } from "@/hooks/use-toast";

export default function CommsMeetings() {
  const { state, update } = useCommsWorkspace();
  const assistant = useCommAssistant();
  const createTask = useCreateCommTask();
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [agenda, setAgenda] = useState("");
  const [activeId, setActiveId] = useState<string | undefined>();

  const active = state.meetings.find((m) => m.id === activeId) ?? state.meetings[0];

  const save = (next: CommMeeting) =>
    update({ meetings: state.meetings.map((m) => (m.id === next.id ? next : m)) });

  const schedule = () => {
    if (!title.trim()) return;
    const meeting: CommMeeting = {
      id: crypto.randomUUID(),
      title: title.trim(),
      starts_at: startsAt || new Date().toISOString(),
      agenda: agenda.trim(),
      notes: "",
      transcript: "",
      recording_url: "",
      summary: "",
      decisions: [],
    };
    update({ meetings: [meeting, ...state.meetings] });
    setTitle(""); setAgenda(""); setStartsAt(""); setActiveId(meeting.id);
    toast({ title: "Meeting scheduled" });
  };

  const summarize = () => {
    if (!active) return;
    assistant.mutate(
      {
        task: ASSISTANT_TASKS.find((t) => t.key === "summarize")!,
        context: `Meeting "${active.title}"\nAgenda: ${active.agenda}\nNotes: ${active.notes}\nTranscript: ${active.transcript}`,
      },
      { onSuccess: (r) => save({ ...active, summary: r.text }) },
    );
  };

  const extractTasks = () => {
    if (!active) return;
    assistant.mutate(
      {
        task: ASSISTANT_TASKS.find((t) => t.key === "tasks")!,
        context: `Meeting "${active.title}" notes:\n${active.notes}\n${active.transcript}`,
      },
      {
        onSuccess: (r) =>
          createTask.mutate(
            { title: `Meeting follow-ups: ${active.title}`, description: r.text, priority: "medium" },
            { onSuccess: () => toast({ title: "Follow-up task created from meeting" }) },
          ),
      },
    );
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm"><CalendarClock className="h-4 w-4" /> Schedule meeting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Meeting title" />
            <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            <Textarea value={agenda} onChange={(e) => setAgenda(e.target.value)} placeholder="Agenda…" className="min-h-[100px]" />
            <Button className="w-full" onClick={schedule} disabled={!title.trim()}>Schedule</Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="divide-y p-0">
            {state.meetings.map((m) => (
              <button key={m.id} onClick={() => setActiveId(m.id)} className="block w-full px-3 py-2 text-left hover:bg-muted/40">
                <p className="truncate text-sm font-medium">{m.title}</p>
                <p className="text-[10px] text-muted-foreground">{format(new Date(m.starts_at), "PP p")}</p>
              </button>
            ))}
            {!state.meetings.length && <p className="p-4 text-xs text-muted-foreground">No meetings scheduled.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Video className="h-4 w-4" /> {active?.title ?? "Select a meeting"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {active ? (
            <>
              <Input
                value={active.recording_url}
                onChange={(e) => save({ ...active, recording_url: e.target.value })}
                placeholder="Recording link (optional)"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Notes</p>
                  <Textarea value={active.notes} onChange={(e) => save({ ...active, notes: e.target.value })} className="min-h-[160px]" />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Transcript</p>
                  <Textarea value={active.transcript} onChange={(e) => save({ ...active, transcript: e.target.value })} className="min-h-[160px]" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={summarize} disabled={assistant.isPending}>
                  {assistant.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
                  AI summary
                </Button>
                <Button size="sm" variant="outline" onClick={extractTasks} disabled={assistant.isPending}>
                  Extract follow-up tasks
                </Button>
              </div>
              {active.summary && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <Badge variant="secondary" className="mb-2 text-[10px]">Summary</Badge>
                  <p className="whitespace-pre-wrap text-sm">{active.summary}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Schedule a meeting to capture agenda, notes, transcript and AI summaries.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
