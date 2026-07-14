import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Network, Info } from "lucide-react";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  active: "bg-green-500/10 text-green-700 dark:text-green-400",
  declined: "bg-muted text-muted-foreground",
  revoked: "bg-destructive/10 text-destructive",
};

export default function NetworkPage() {
  const { agencyId } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["network-partnerships", agencyId],
    enabled: !!agencyId,
    queryFn: async (): Promise<Any[]> => {
      const { data, error } = await supabase.from("network_partnerships" as never).select("*").order("requested_at" as never, { ascending: false });
      if (error) throw error;
      return (data ?? []) as Any[];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const patch: Record<string, unknown> = { status };
      if (status === "active") patch.activated_at = new Date().toISOString();
      const { error } = await supabase.from("network_partnerships" as never).update(patch as never).eq("id" as never, id as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["network-partnerships"] }),
  });

  const act = async (id: string, status: string) => {
    try { await update.mutateAsync({ id, status }); toast.success(`Partnership ${status}`); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Network className="h-5 w-5" /> Network</h1>
        <p className="text-sm text-muted-foreground">Opt-in partnerships with other agencies for cross-agency talent and job sharing.</p>
      </div>

      <Card className="p-3 border-primary/40 bg-primary/5 flex items-start gap-2 text-sm">
        <Info className="h-4 w-4 text-primary mt-0.5" />
        <span>
          Live cross-agency sharing is disabled by default. A partnership must be created and set to <b>active</b> by both sides
          before any talent or job order flows across agencies.
        </span>
      </Card>

      {q.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {!q.isLoading && (q.data?.length ?? 0) === 0 && (
        <Card className="p-8 text-center">
          <Network className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">No network partnerships yet</p>
          <p className="text-sm text-muted-foreground">Partnerships appear here once another agency invites you or you invite them.</p>
        </Card>
      )}

      <div className="space-y-2">
        {q.data?.map((p: Any) => {
          const isPartner = p.partner_agency_id === agencyId;
          const other = isPartner ? p.requesting_agency_id : p.partner_agency_id;
          return (
            <Card key={p.id} className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium">Agency #{String(other).slice(0, 8)}</div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                  <span>{isPartner ? "Invited you" : "You invited"}</span>
                  {p.shared_talent && <span>· talent</span>}
                  {p.shared_job_orders && <span>· job orders</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={STATUS_COLORS[p.status] ?? ""}>{p.status}</Badge>
                {p.status === "pending" && isPartner && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => act(p.id, "declined")}>Decline</Button>
                    <Button size="sm" onClick={() => act(p.id, "active")}>Accept</Button>
                  </>
                )}
                {p.status === "active" && (
                  <Button size="sm" variant="outline" onClick={() => act(p.id, "revoked")}>Revoke</Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
