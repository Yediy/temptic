import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useWoicRecommendations, useRunWoicRecommend } from "@/hooks/use-woic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

export default function WoicRecommendations() {
  const { agencyId } = useAuth();
  const [entity, setEntity] = useState<"job" | "worker">("job");
  const [id, setId] = useState("");
  const list = useWoicRecommendations(agencyId ?? undefined, { limit: 50 });
  const run = useRunWoicRecommend();

  const trigger = async () => {
    if (!agencyId || !id) return;
    try {
      await run.mutateAsync({ agency_id: agencyId, subject_entity: entity, subject_id: id, limit: 10 });
      toast({ title: "Recommendations generated" });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Generate Recommendations</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2 items-end">
          <div className="w-40">
            <Select value={entity} onValueChange={(v) => setEntity(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="job">Job → Workers</SelectItem>
                <SelectItem value="worker">Worker → Jobs</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input className="flex-1 min-w-64" placeholder="Subject UUID" value={id} onChange={(e) => setId(e.target.value.trim())} />
          <Button onClick={trigger} disabled={!id || run.isPending}>
            {run.isPending ? "Running…" : "Run"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Recommendations</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {list.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {list.data?.length === 0 && <p className="text-sm text-muted-foreground">No recommendations yet.</p>}
          {list.data?.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between rounded-md border p-3">
              <div className="text-sm">
                <p className="font-medium">{r.subject_entity} → {r.target_entity}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {String(r.subject_id).slice(0, 8)} → {String(r.target_id).slice(0, 8)}
                </p>
              </div>
              <Badge>{(Number(r.score) * 100).toFixed(0)}%</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
