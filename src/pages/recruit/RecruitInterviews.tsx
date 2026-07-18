import { useAuth } from "@/lib/auth";
import { useInterviews } from "@/hooks/recruit/use-recruit";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function RecruitInterviews() {
  const { agencyId } = useAuth();
  const q = useInterviews(agencyId ?? undefined);
  if (q.isLoading) return <LoadingState />;
  if (q.error) return <ErrorState error={q.error} />;
  if (!q.data?.length) return <EmptyState label="No interviews scheduled." />;
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Scheduled</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead>Outcome</TableHead>
            <TableHead>Location</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {q.data.map((i: { id: string; scheduled_at?: string; mode?: string; outcome?: string; location?: string }) => (
            <TableRow key={i.id}>
              <TableCell>{i.scheduled_at ? new Date(i.scheduled_at).toLocaleString() : "—"}</TableCell>
              <TableCell>{i.mode ?? "—"}</TableCell>
              <TableCell>{i.outcome ?? "pending"}</TableCell>
              <TableCell>{i.location ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
