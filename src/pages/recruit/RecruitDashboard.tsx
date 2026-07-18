import { useAuth } from "@/lib/auth";
import { useJobOrders, useRecruitCandidates, usePlacements, useInterviews } from "@/hooks/recruit/use-recruit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Users, ClipboardCheck, CalendarClock } from "lucide-react";

export default function RecruitDashboard() {
  const { agencyId } = useAuth();
  const jobs = useJobOrders(agencyId ?? undefined);
  const cands = useRecruitCandidates(agencyId ?? undefined);
  const placements = usePlacements(agencyId ?? undefined);
  const interviews = useInterviews(agencyId ?? undefined);

  const stats = [
    { label: "Open Job Orders", icon: Briefcase, value: jobs.data?.filter((j: { status?: string }) => j.status === "open").length ?? "—" },
    { label: "Candidates", icon: Users, value: cands.data?.length ?? "—" },
    { label: "Active Placements", icon: ClipboardCheck, value: placements.data?.filter((p: { status?: string }) => p.status === "active").length ?? "—" },
    { label: "Interviews (last)", icon: CalendarClock, value: interviews.data?.length ?? "—" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
            <s.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{s.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
