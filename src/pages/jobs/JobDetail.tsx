import { useParams, Link } from "react-router-dom";
import { useJobOrder, useApplications, useRecordDecision } from "@/hooks/use-jobs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: job, isLoading } = useJobOrder(id);
  const { data: apps } = useApplications(id);
  const decide = useRecordDecision();

  const record = async (application_id: string, decision: string) => {
    try {
      await decide.mutateAsync({ application_id, decision });
      toast.success(`Decision recorded: ${decision}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record decision");
    }
  };

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!job) return <div className="text-sm text-muted-foreground">Job order not found.</div>;

  return (
    <div className="space-y-6">
      <Link to="/jobs" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to jobs
      </Link>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{job.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {job.positions_filled}/{job.positions_needed} filled · {job.location ?? "—"}
          </p>
        </div>
        <Badge>{job.status}</Badge>
      </div>

      {job.description && (
        <Card className="p-4"><p className="text-sm whitespace-pre-wrap">{job.description}</p></Card>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">Applications</h2>
        {(!apps || apps.length === 0) && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No applications yet. Use Blind Review to source candidates.
          </Card>
        )}
        <div className="space-y-2">
          {apps?.map((a) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const app = a as any;
            const w = app.worker;
            return (
              <Card key={app.id} className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{w ? `${w.first_name ?? ""} ${w.last_name ?? ""}`.trim() : "Candidate"}</div>
                  <div className="text-xs text-muted-foreground">{app.status}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => record(app.id, "reject")}>Reject</Button>
                  <Button size="sm" onClick={() => record(app.id, "advance")}>Advance</Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
