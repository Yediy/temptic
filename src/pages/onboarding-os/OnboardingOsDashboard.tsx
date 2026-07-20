import { useAuth } from "@/lib/auth";
import { useOnboardingSessions } from "@/hooks/onboarding/use-onboarding-os";
import { useOnboardingBoard } from "@/hooks/use-onboarding";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, ShieldCheck, GraduationCap, FileSignature, ClipboardCheck } from "lucide-react";

function Stat({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-start gap-3">
        <div className="p-2 rounded-md bg-primary/10 text-primary"><Icon className="w-4 h-4" /></div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function OnboardingOsDashboard() {
  const { agencyId } = useAuth();
  const { data: sessions = [] } = useOnboardingSessions(agencyId ?? undefined);
  const { data: board = [] } = useOnboardingBoard(agencyId ?? undefined);

  const inProgress = sessions.filter((s) => s.status === "in_progress").length;
  const completed = sessions.filter((s) => s.status === "completed").length;
  const readyStage = board.filter((r: any) => r.stage === "ready" || r.stage === "placed").length;
  const complianceStage = board.filter((r: any) => r.stage === "compliance" || r.stage === "documents").length;
  const trainingStage = board.filter((r: any) => r.stage === "training").length;

  const avgProgress = sessions.length
    ? Math.round(sessions.reduce((sum, s) => sum + (s.progress_pct ?? 0), 0) / sessions.length)
    : 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat icon={Users} label="In progress" value={inProgress} />
        <Stat icon={ClipboardCheck} label="Completed" value={completed} />
        <Stat icon={ShieldCheck} label="Compliance queue" value={complianceStage} />
        <Stat icon={GraduationCap} label="In training" value={trainingStage} />
        <Stat icon={FileSignature} label="Ready to place" value={readyStage} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Average completion</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Progress value={avgProgress} />
          <p className="text-sm text-muted-foreground">{avgProgress}% average across active workers.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No onboarding sessions yet. Start one from a Talent Passport.</p>
          ) : (
            <div className="divide-y">
              {sessions.slice(0, 10).map((s) => (
                <div key={s.id} className="py-2 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">
                      {s.worker?.first_name} {s.worker?.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.current_step ?? "—"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{s.progress_pct}%</span>
                    <Badge variant={s.status === "completed" ? "default" : "secondary"}>{s.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
