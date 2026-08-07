import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Search, Sparkles, Loader2 } from "lucide-react";
import { useCommSearch } from "@/hooks/comms/use-comms";

const MODES = [
  { key: "keyword", label: "Keyword" },
  { key: "semantic", label: "Semantic" },
  { key: "natural", label: "Natural language" },
] as const;

export default function CommsSearch() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<(typeof MODES)[number]["key"]>("keyword");
  const { data, isFetching } = useCommSearch(query, mode);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm"><Search className="h-4 w-4" /> Universal communication search</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") setQuery(input); }}
              placeholder='e.g. "unsigned tickets discussed with Acme last week"'
              className="max-w-xl"
            />
            <Button onClick={() => setQuery(input)} disabled={input.trim().length < 2}>Search</Button>
          </div>
          <div className="flex gap-1">
            {MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs transition-colors",
                  mode === m.key ? "bg-muted font-semibold" : "text-muted-foreground hover:bg-muted/50",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {isFetching && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Searching the fabric…
        </p>
      )}

      {data?.ai && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4 text-primary" /> AI interpretation</CardTitle>
          </CardHeader>
          <CardContent><p className="whitespace-pre-wrap text-sm">{data.ai}</p></CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Messages</CardTitle></CardHeader>
          <CardContent className="divide-y p-0">
            {(data?.messages ?? []).map((m) => (
              <div key={String(m.id)} className="px-4 py-2.5">
                <p className="line-clamp-2 text-sm">{String(m.body ?? "")}</p>
                <p className="text-[10px] text-muted-foreground">
                  {m.created_at ? formatDistanceToNow(new Date(String(m.created_at)), { addSuffix: true }) : ""}
                </p>
              </div>
            ))}
            {!data?.messages?.length && <p className="p-4 text-xs text-muted-foreground">No message matches.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Records &amp; entities</CardTitle></CardHeader>
          <CardContent className="divide-y p-0">
            {(data?.records ?? []).map((r) => (
              <div key={String(r.id)} className="flex items-start gap-2 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{String(r.title ?? "")}</p>
                  {r.subtitle && <p className="truncate text-xs text-muted-foreground">{String(r.subtitle)}</p>}
                </div>
                <Badge variant="outline" className="shrink-0 text-[9px] uppercase">{String(r.entity_type ?? "")}</Badge>
              </div>
            ))}
            {!data?.records?.length && <p className="p-4 text-xs text-muted-foreground">No entity matches.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
