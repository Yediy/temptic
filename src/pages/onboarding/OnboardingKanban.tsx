import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { STAGES, useOnboardingBoard, useUpdateStage, type OnboardingStage } from "@/hooks/use-onboarding";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GripVertical } from "lucide-react";

export default function OnboardingKanban() {
  const { agencyId } = useAuth();
  const { data, isLoading } = useOnboardingBoard(agencyId ?? undefined);
  const updateStage = useUpdateStage();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | OnboardingStage>("all");

  const grouped = useMemo(() => {
    const map = new Map<OnboardingStage, typeof data>();
    STAGES.forEach((s) => map.set(s.key, [] as never));
    (data ?? []).forEach((row) => {
      const arr = map.get(row.stage) ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (arr as any[]).push(row);
      map.set(row.stage, arr);
    });
    return map;
  }, [data]);

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading onboarding board…</div>;
  }

  const stages = filter === "all" ? STAGES : STAGES.filter((s) => s.key === filter);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Onboarding</h1>
          <p className="text-sm text-muted-foreground">12-stage pipeline. Change a stage to move a worker forward.</p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {(data?.length ?? 0) === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No workers are enrolled in onboarding yet. Enroll from a talent passport to start a checklist.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {stages.map((s) => {
          const rows = (grouped.get(s.key) ?? []) as Array<{
            id: string;
            stage: OnboardingStage;
            worker_id: string;
            worker: { first_name: string; last_name: string; email: string } | null;
          }>;
          return (
            <Card key={s.key} className="min-h-[240px]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>{s.label}</span>
                  <Badge variant="secondary">{rows.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {rows.map((r) => (
                  <div key={r.id} className="border rounded-md p-2 text-sm space-y-2 bg-card">
                    <button
                      onClick={() => navigate(`/talent/${r.worker_id}`)}
                      className="flex items-center gap-2 text-left w-full hover:underline"
                    >
                      <GripVertical className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        {r.worker?.first_name} {r.worker?.last_name}
                      </span>
                    </button>
                    <Select
                      value={r.stage}
                      onValueChange={(v) => updateStage.mutate({ id: r.id, stage: v as OnboardingStage })}
                    >
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STAGES.map((st) => <SelectItem key={st.key} value={st.key}>{st.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                {rows.length === 0 && <p className="text-xs text-muted-foreground">Empty.</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="pt-4">
        <Button variant="outline" size="sm" onClick={() => navigate("/talent")}>Back to Talent</Button>
      </div>
    </div>
  );
}
