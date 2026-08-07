import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useKnowledgeAssistant } from "@/hooks/knowledge/use-knowledge";
import { ASSISTANT_TASKS } from "@/lib/knowledge/taxonomy";

export default function KnowledgeInsights() {
  const { agencyId } = useAuth();
  const assistant = useKnowledgeAssistant();
  const [prompt, setPrompt] = useState("");

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="bg-card/60 backdrop-blur lg:col-span-1">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Cognitive capabilities</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          {ASSISTANT_TASKS.map((t) => (
            <Button
              key={t.key}
              variant="outline"
              size="sm"
              className="justify-start"
              disabled={!agencyId || assistant.isPending}
              onClick={() => assistant.mutate({ agency_id: agencyId!, task: t.key, prompt: prompt || undefined })}
            >
              <Sparkles className="mr-2 h-3.5 w-3.5" />{t.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur lg:col-span-2">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Corpus-level analysis</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Optional focus, e.g. 'safety knowledge for construction crews in Texas'…"
          />
          {assistant.isPending && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> WOIC is analyzing organizational knowledge…
            </p>
          )}
          {assistant.error && <p className="text-sm text-destructive">{(assistant.error as Error).message}</p>}
          {assistant.data && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {assistant.data.task}
              </p>
              <p className="whitespace-pre-wrap text-sm">{assistant.data.text}</p>
            </div>
          )}
          {!assistant.data && !assistant.isPending && (
            <p className="text-sm text-muted-foreground">
              Select a capability to generate insights. All processing runs in the Knowledge Intelligence Engine
              via the WOIC cognitive core — nothing is computed client-side.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
