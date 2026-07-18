import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRecruiterAssistant } from "@/hooks/recruit/use-recruit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from "lucide-react";

interface Msg { role: "user" | "assistant"; content: string }

export default function RecruitAssistant() {
  const { agencyId } = useAuth();
  const assistant = useRecruiterAssistant();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");

  async function send() {
    if (!input.trim() || !agencyId) return;
    const next: Msg[] = [...messages, { role: "user", content: input }];
    setMessages(next);
    setInput("");
    try {
      const res = await assistant.mutateAsync({
        agency_id: agencyId,
        task: "chat",
        messages: [
          { role: "system", content: "You are an AI recruiting assistant for a staffing agency. Be concise, factual, and never use protected demographic data in ranking." },
          ...next,
        ],
      });
      setMessages([...next, { role: "assistant", content: res.content }]);
    } catch (e) {
      setMessages([...next, { role: "assistant", content: `Error: ${e instanceof Error ? e.message : String(e)}` }]);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> AI Recruiter Center
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="min-h-[260px] space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
          {messages.length === 0 && (
            <p className="text-muted-foreground">
              Ask me to summarize candidates, draft outreach, or suggest next actions on a job order.
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : ""}>
              <span className={`inline-block max-w-[85%] rounded-lg px-3 py-1.5 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-background border"}`}>
                <span className="whitespace-pre-wrap">{m.content}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Draft a follow-up for Jane, an electrician with 6 years experience…"
            className="min-h-[60px]"
          />
          <Button onClick={send} disabled={assistant.isPending || !input.trim()}>
            {assistant.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
