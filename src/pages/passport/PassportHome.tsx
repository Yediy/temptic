import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { usePassport, usePassportBundle, useRecomputeScores, useRunCareerCoach } from "@/hooks/passport/use-workforce-passport";
import { LoadingState, ErrorState } from "@/components/woic/AsyncState";
import { toast } from "@/hooks/use-toast";

export default function PassportHome() {
  const { passportId } = useParams();
  const { data: passport, isLoading, error } = usePassport(passportId);
  const bundle = usePassportBundle(passportId, passport?.worker_id);
  const recompute = useRecomputeScores(passportId!);
  const coach = useRunCareerCoach(passportId!);

  if (isLoading) return <LoadingState />;
  if (error || !passport) return <ErrorState error={error} />;

  const stats = [
    { label: "Profile Completion", value: passport.completion_score },
    { label: "Compliance", value: passport.compliance_score },
    { label: "Skill Score", value: passport.skill_score },
    { label: "Career Score", value: Math.round(Number(passport.career_score)) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => recompute.mutate(undefined, {
          onSuccess: () => toast({ title: "Scores recomputed" }),
          onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
        })} disabled={recompute.isPending}>
          {recompute.isPending ? "Recomputing…" : "Recompute Scores"}
        </Button>
        <Button size="sm" onClick={() => coach.mutate(undefined, {
          onSuccess: () => toast({ title: "AI Career Coach ran" }),
          onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
        })} disabled={coach.isPending}>
          {coach.isPending ? "Analyzing…" : "Run AI Career Coach"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{s.label}</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{s.value}</div>
              <Progress value={s.value} className="mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-sm">Identity</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div>Verification: <span className="font-medium">{passport.identity_verification_status}</span></div>
            <div>Right to Work: <span className="font-medium">{passport.right_to_work_status}</span></div>
            <div>Availability: <span className="font-medium">{passport.availability_status}</span></div>
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="text-sm">Records</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div>Skills: <span className="font-medium">{bundle.data?.skills.length ?? 0}</span></div>
            <div>Certifications: <span className="font-medium">{bundle.data?.credentials.length ?? 0}</span></div>
            <div>Employment: <span className="font-medium">{bundle.data?.employment.length ?? 0}</span></div>
            <div>Documents: <span className="font-medium">{bundle.data?.documents.length ?? 0}</span></div>
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="text-sm">Reputation</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <div className="text-3xl font-bold">{Number(passport.reputation_score).toFixed(2)}<span className="text-sm text-muted-foreground">/5</span></div>
            <div className="text-xs text-muted-foreground mt-1">Across {bundle.data?.reputation.length ?? 0} categories</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Recent Timeline</CardTitle></CardHeader>
        <CardContent className="text-sm">
          {(bundle.data?.timeline ?? []).slice(0, 8).map((t) => (
            <div key={t.id} className="border-b py-2 last:border-0">
              <div className="font-medium">{t.title}</div>
              <div className="text-xs text-muted-foreground">{new Date(t.event_date).toLocaleString()} · {t.event_type}</div>
            </div>
          ))}
          {(bundle.data?.timeline ?? []).length === 0 && <p className="text-muted-foreground">No events yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
