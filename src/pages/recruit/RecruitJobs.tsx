import { useAuth } from "@/lib/auth";
import { useJobOrders, useMatchJob } from "@/hooks/recruit/use-recruit";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

export default function RecruitJobs() {
  const { agencyId } = useAuth();
  const q = useJobOrders(agencyId ?? undefined);
  const match = useMatchJob();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (q.isLoading) return <LoadingState />;
  if (q.error) return <ErrorState error={q.error} />;
  if (!q.data?.length) return <EmptyState label="No job orders yet." />;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Openings</TableHead>
            <TableHead className="text-right">AI Match</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {q.data.map((j: { id: string; title?: string; status?: string; openings?: number }) => (
            <TableRow key={j.id}>
              <TableCell className="font-medium">{j.title ?? "—"}</TableCell>
              <TableCell><Badge variant="outline">{j.status ?? "—"}</Badge></TableCell>
              <TableCell>{j.openings ?? "—"}</TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === j.id}
                  onClick={async () => {
                    setBusyId(j.id);
                    try {
                      const results = await match.mutateAsync({ agency_id: agencyId!, job_order_id: j.id });
                      toast({ title: "AI matches", description: `${results.length} candidates ranked.` });
                    } catch (e) {
                      toast({ title: "Match failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
                    } finally {
                      setBusyId(null);
                    }
                  }}
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  Rank candidates
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
