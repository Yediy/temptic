import { useState } from "react";
import { useOnboardingAssistant } from "@/hooks/onboarding/use-onboarding-os";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function OnboardingAssistantPage() {
  const ask = useOnboardingAssistant();
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<Array<{ q: string; a: string }>>([]);

  async function send() {
    if (!question.trim()) return;
    const q = question;
    setQuestion("");
    const res = await ask.mutateAsync({ question: q });
    setHistory((h) => [...h, { q, a: res.answer }]);
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <Card>
        <CardHeader className="flex-row items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">Onboarding Assistant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {history.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Ask about I-9 requirements, background delays, missing training, or what a worker needs to reach 100%.
            </p>
          )}
          {history.map((h, i) => (
            <div key={i} className="space-y-2">
              <div className="text-sm font-medium">You: {h.q}</div>
              <div className="prose prose-sm max-w-none rounded-md border bg-muted/40 p-3">
                <ReactMarkdown>{h.a}</ReactMarkdown>
              </div>
            </div>
          ))}
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What does this worker need to be assignment-ready?"
            rows={3}
          />
          <div className="flex justify-end">
            <Button disabled={ask.isPending || !question.trim()} onClick={send}>
              {ask.isPending && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
              Ask
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
