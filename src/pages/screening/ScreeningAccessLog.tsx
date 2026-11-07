import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { History, ArrowLeft } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;
const ACTIONS = ["all", "read", "sign", "download"] as const;

export default function ScreeningAccessLog() {
  const { agencyId } = useAuth();
  const [action, setAction] = useState<(typeof ACTIONS)[number]>("all");
  const [q, setQ] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["screening-access-log", agencyId, action],
    enabled: !!agencyId,
    queryFn: async (): Promise<Row[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase.from as any)("screening_access_log")
        .select("*")
        .eq("agency_id", agencyId!)
        .order("created_at", { ascending: false })
        .limit(500);
      if (action !== "all") query = query.eq("action", action);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const s = q.trim().toLowerCase();
  const rows = (data ?? []).filter(
    (r) => !s || [r.actor_user_id, r.record_id, r.worker_id, r.order_id].some((v) => String(v ?? "").includes(s)),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-5 w-5" /> Screening access trail
          </h1>
          <p className="text-sm text-muted-foreground">
            Every view, signature and download of screening orders, reports and consents. Entries cannot be changed.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/screening"><ArrowLeft className="h-4 w-4 mr-1" />Screening</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {ACTIONS.map((a) => (
          <Button key={a} size="sm" variant={action === a ? "default" : "outline"} onClick={() => setAction(a)}>
            {a}
          </Button>
        ))}
        <Input className="max-w-xs ml-auto" placeholder="Filter by user, record, worker ID…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {error && (
        <div className="text-sm text-destructive">
          Couldn't load the trail. Only agency admins and compliance specialists can view it.
        </div>
      )}
      {!isLoading && !error && rows.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">No access recorded yet.</Card>
      )}

      {rows.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b">
              <tr>
                <th className="p-2">When</th><th className="p-2">Action</th><th className="p-2">Record</th>
                <th className="p-2">Who</th><th className="p-2">Roles</th><th className="p-2">Worker</th><th className="p-2">IP / device</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-2"><Badge variant={r.action === "read" ? "secondary" : "default"}>{r.action}</Badge></td>
                  <td className="p-2 font-mono text-xs">{r.record_type} · {String(r.record_id).slice(0, 8)}</td>
                  <td className="p-2 font-mono text-xs">{r.actor_user_id ? String(r.actor_user_id).slice(0, 8) : "system"}</td>
                  <td className="p-2 text-xs">{(r.actor_roles ?? []).join(", ") || "—"}</td>
                  <td className="p-2 font-mono text-xs">{r.worker_id ? String(r.worker_id).slice(0, 8) : "—"}</td>
                  <td className="p-2 text-xs text-muted-foreground max-w-[220px] truncate" title={r.user_agent ?? ""}>
                    {r.ip_address || "—"} {r.user_agent ? `· ${r.user_agent}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
