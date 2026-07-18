import { useAuth } from "@/lib/auth";
import { useRecruitPipelines, useRecruitPipelineBoard, useAdvancePipeline } from "@/hooks/recruit/use-recruit";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";

export default function RecruitPipeline() {
  const { agencyId } = useAuth();
  const pipelines = useRecruitPipelines(agencyId ?? undefined);
  const [pipelineId, setPipelineId] = useState<string | undefined>();
  const activeId = pipelineId ?? pipelines.data?.[0]?.id;
  const board = useRecruitPipelineBoard(activeId);
  const advance = useAdvancePipeline();

  const stages = useMemo(() => board.data?.stages ?? [], [board.data]);
  const entriesByStage = useMemo(() => {
    const map = new Map<string, typeof board.data.entries>();
    for (const s of stages) map.set(s.id, []);
    for (const e of board.data?.entries ?? []) map.get(e.stage_id)?.push(e);
    return map;
  }, [board.data, stages]);

  if (pipelines.isLoading) return <LoadingState />;
  if (pipelines.error) return <ErrorState error={pipelines.error} />;
  if (!pipelines.data?.length) return <EmptyState label="No pipelines yet. Create one to begin tracking candidates." />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Pipeline</span>
        <Select value={activeId} onValueChange={setPipelineId}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select pipeline" /></SelectTrigger>
          <SelectContent>
            {pipelines.data.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {board.isLoading ? <LoadingState /> : board.error ? <ErrorState error={board.error} /> : (
        <div className="grid grid-flow-col auto-cols-[minmax(260px,1fr)] gap-3 overflow-x-auto pb-3">
          {stages.map((s) => (
            <Card key={s.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{s.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(entriesByStage.get(s.id) ?? []).map((e) => (
                  <div key={e.id} className="rounded border bg-card p-2 text-xs">
                    <p className="font-medium">Worker {e.worker_id.slice(0, 8)}</p>
                    {e.notes && <p className="text-muted-foreground line-clamp-2">{e.notes}</p>}
                    <Select
                      onValueChange={async (nextStage) => {
                        try {
                          await advance.mutateAsync({
                            agency_id: agencyId!, entry_id: e.id, stage_id: nextStage, pipeline_id: activeId!,
                          });
                          toast({ title: "Advanced" });
                        } catch (err) {
                          toast({ title: "Failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
                        }
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs mt-1"><SelectValue placeholder="Move to…" /></SelectTrigger>
                      <SelectContent>
                        {stages.filter((x) => x.id !== s.id).map((x) => (
                          <SelectItem key={x.id} value={x.id}>{x.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
