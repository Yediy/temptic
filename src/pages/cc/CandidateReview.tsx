import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useCcApprove } from "@/hooks/cc/use-client-collab";

export default function CandidateReview() {
  const { clientId } = useParams();
  const approve = useCcApprove();
  const { data } = useQuery({
    enabled: !!clientId,
    queryKey: ["cc", "candidates", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_submissions")
        .select("id, status, notes, worker:workers(first_name, last_name, trade), job:job_orders!inner(id, title, client_id)")
        .eq("job.client_id", clientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Candidate Review</h2>
      <div className="rounded-xl border bg-card divide-y">
        {(data ?? []).map((c: any) => (
          <div key={c.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium text-sm">
                {c.worker?.first_name} {c.worker?.last_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {c.worker?.trade} · {c.job?.title}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => approve.mutate({ target: "request", id: c.id, decision: "reject" })}>Reject</Button>
              <Button size="sm" onClick={() => approve.mutate({ target: "request", id: c.id, decision: "approve" })}>Approve</Button>
            </div>
          </div>
        ))}
        {!data?.length && <p className="p-6 text-sm text-muted-foreground">No candidates submitted yet.</p>}
      </div>
    </div>
  );
}
