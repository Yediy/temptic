import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useWoicRecommendations, useRunWoicRecommend } from "@/hooks/use-woic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  DataPanel,
  DataPanelColumn,
  DetailField,
  DetailJson,
  fmtDate,
  fmtPct,
  short,
} from "@/components/woic/DataPanel";
import { ErrorState } from "@/components/woic/AsyncState";
import type { WoicRecommendation } from "@/lib/woic/types";

const columns: DataPanelColumn<WoicRecommendation>[] = [
  { key: "kind", header: "Kind", cell: (r) => r.kind },
  {
    key: "pair",
    header: "Subject → Target",
    cell: (r) => (
      <span className="font-mono text-xs">
        {r.subject_entity}/{short(r.subject_id)} → {r.target_entity}/{short(r.target_id)}
      </span>
    ),
  },
  { key: "score", header: "Score", cell: (r) => <Badge>{fmtPct(r.score)}</Badge> },
  {
    key: "status",
    header: "Status",
    cell: (r) => <Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge>,
  },
  { key: "created_at", header: "Created", cell: (r) => fmtDate(r.created_at) },
];

export default function WoicRecommendations() {
  const { agencyId } = useAuth();
  const [entity, setEntity] = useState<"job" | "worker">("job");
  const [id, setId] = useState("");
  const list = useWoicRecommendations(agencyId ?? undefined, { limit: 100 });
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
            <Select value={entity} onValueChange={(v) => setEntity(v as "job" | "worker")}>
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
          {run.error && <div className="w-full"><ErrorState error={run.error} /></div>}
        </CardContent>
      </Card>

      <DataPanel<WoicRecommendation>
        title="Recent Recommendations"
        columns={columns}
        rows={list.data as WoicRecommendation[] | undefined}
        isLoading={list.isLoading}
        error={list.error}
        emptyLabel="No recommendations yet."
        detailTitle={(r) => `${r.kind} · ${fmtPct(r.score)}`}
        renderDetail={(r) => (
          <div className="space-y-1">
            <DetailField label="Kind" value={r.kind} />
            <DetailField label="Subject" value={<span className="font-mono text-xs">{r.subject_entity}/{r.subject_id}</span>} />
            <DetailField label="Target" value={<span className="font-mono text-xs">{r.target_entity}/{r.target_id}</span>} />
            <DetailField label="Score" value={fmtPct(r.score)} />
            <DetailField label="Status" value={r.status} />
            <DetailField label="Expires" value={fmtDate(r.expires_at)} />
            <DetailField label="Created" value={fmtDate(r.created_at)} />
            <DetailField label="Reasoning" value={r.reasoning} />
            <DetailJson label="Why" value={r.why} />
          </div>
        )}
      />
    </div>
  );
}
