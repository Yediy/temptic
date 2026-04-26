import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Gauge } from "lucide-react";

export default function AdminRateLimits() {
  const { data: events, isLoading } = useQuery({
    queryKey: ["admin-rate-limit-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rate_limit_events")
        .select(
          "id, endpoint, rate_key, ip_address, user_id, user_role, attempt_count, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Gauge className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rate Limit Events</h1>
          <p className="text-sm text-muted-foreground">
            Audit log of requests blocked by edge function rate limiters. Use
            this to spot abuse and tune limits.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent blocked requests (last 200)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !events?.length ? (
            <p className="text-sm text-muted-foreground">
              No rate limit events recorded.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Rate key</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {e.endpoint}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate font-mono text-xs">
                      {e.rate_key}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {e.ip_address || "—"}
                    </TableCell>
                    <TableCell className="capitalize text-xs">
                      {e.user_role || "—"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate font-mono text-xs text-muted-foreground">
                      {e.user_id || "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(e.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
