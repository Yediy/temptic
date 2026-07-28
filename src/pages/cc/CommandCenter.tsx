import { useParams } from "react-router-dom";
import { useCommandCenter } from "@/hooks/cc/use-client-collab";
import { StatCard } from "@/components/StatCard";
import { Briefcase, Users, ClipboardCheck, FileText, Bell, HelpCircle, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function CommandCenter() {
  const { clientId } = useParams();
  const { data, isLoading } = useCommandCenter(clientId);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading workspace…</p>;
  if (!data) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatCard label="Open Job Orders" value={data.openOrders} icon={Briefcase} />
        <StatCard label="Open Positions" value={data.openPositions} icon={Briefcase} />
        <StatCard label="Workers Assigned" value={data.assigned} icon={Users} />
        <StatCard label="Approvals Due" value={data.pendingApprovals} icon={ClipboardCheck} />
        <StatCard label="Tickets Awaiting" value={data.ticketsAwaiting} icon={FileText} />
        <StatCard label="Open Invoices" value={data.invoicesOpen} icon={FileText} />
        <StatCard label="Open Requests" value={data.openRequests} icon={HelpCircle} />
        <StatCard label="Unread Alerts" value={data.alerts} icon={Bell} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Recent Activity</h3>
          </div>
          <div className="divide-y">
            {data.activity.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">No activity yet.</p>
            )}
            {data.activity.map((a) => (
              <div key={a.id} className="px-4 py-3 text-sm">
                <p className="font-medium">{a.verb}</p>
                <p className="text-xs text-muted-foreground">
                  {a.actor_kind} · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">WOIC Advisor</h3>
          </div>
          <div className="divide-y">
            {data.recommendations.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">No recommendations yet.</p>
            )}
            {data.recommendations.map((r) => (
              <div key={r.id} className="px-4 py-3">
                <p className="text-sm font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{r.body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
