import { useAuth } from "@/lib/auth";
import { useRecruitCandidates } from "@/hooks/recruit/use-recruit";
import { LoadingState, ErrorState, EmptyState } from "@/components/woic/AsyncState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

export default function RecruitCandidates() {
  const { agencyId } = useAuth();
  const q = useRecruitCandidates(agencyId ?? undefined);

  if (q.isLoading) return <LoadingState />;
  if (q.error) return <ErrorState error={q.error} />;
  if (!q.data?.length) return <EmptyState label="No candidates yet." />;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Trade</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {q.data.map((w) => (
            <TableRow key={w.id}>
              <TableCell>
                <Link className="text-primary hover:underline" to={`/talent/${w.id}`}>
                  {w.first_name} {w.last_name}
                </Link>
              </TableCell>
              <TableCell>{w.email ?? "—"}</TableCell>
              <TableCell>{w.trade ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={w.is_active ? "default" : "secondary"}>
                  {w.is_active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
