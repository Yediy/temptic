import { useAuth } from "@/lib/auth";
import { usePlacements } from "@/hooks/recruit/use-recruit";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function RecruitPlacements() {
  const { agencyId } = useAuth();
  const q = usePlacements(agencyId ?? undefined);
  if (q.isLoading) return <LoadingState />;
  if (q.error) return <ErrorState error={q.error} />;
  if (!q.data?.length) return <EmptyState label="No placements yet." />;
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Worker</TableHead>
            <TableHead>Starts</TableHead>
            <TableHead>Ends</TableHead>
            <TableHead>Pay / Bill</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {q.data.map((p: { id: string; worker_id: string; starts_on: string; ends_on: string | null; pay_rate: number | null; bill_rate: number | null; status: string }) => (
            <TableRow key={p.id}>
              <TableCell>{p.worker_id.slice(0, 8)}</TableCell>
              <TableCell>{new Date(p.starts_on).toLocaleDateString()}</TableCell>
              <TableCell>{p.ends_on ? new Date(p.ends_on).toLocaleDateString() : "—"}</TableCell>
              <TableCell>${p.pay_rate ?? "—"} / ${p.bill_rate ?? "—"}</TableCell>
              <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
