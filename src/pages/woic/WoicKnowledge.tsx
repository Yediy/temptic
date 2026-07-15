import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useWoicKnowledgeSearch } from "@/hooks/use-woic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function WoicKnowledge() {
  const { agencyId } = useAuth();
  const [q, setQ] = useState("");
  const search = useWoicKnowledgeSearch(agencyId ?? undefined, q);

  return (
    <Card>
      <CardHeader><CardTitle>Knowledge Search</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="Search knowledge articles…" value={q} onChange={(e) => setQ(e.target.value)} />
        {search.isLoading && <p className="text-sm text-muted-foreground">Searching…</p>}
        {search.data?.length === 0 && q && <p className="text-sm text-muted-foreground">No matches.</p>}
        <div className="space-y-2">
          {search.data?.map((a: any) => (
            <div key={a.id} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">
                  {a.tags?.join(", ") ?? "no tags"} · Updated {new Date(a.updated_at).toLocaleDateString()}
                </p>
              </div>
              <Badge variant={a.status === "published" ? "default" : "secondary"}>{a.status}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
