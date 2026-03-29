import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";

export default function AdminNotifications() {
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["admin-failed-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, ticket_id, recipient_type, recipient_email, template_key, status, error_message, created_at, sent_at")
        .in("status", ["failed", "queued", "skipped"])
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const statusColor = (s: string) => {
    if (s === "failed") return "destructive";
    if (s === "queued") return "secondary";
    if (s === "skipped") return "outline";
    return "default";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Notification Issues</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notification Log</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !notifications?.length ? (
            <p className="text-muted-foreground text-sm">No failed or queued notifications.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-mono text-xs">{n.template_key}</TableCell>
                    <TableCell>{n.recipient_email || "—"}</TableCell>
                    <TableCell className="capitalize">{n.recipient_type}</TableCell>
                    <TableCell>
                      <Badge variant={statusColor(n.status)}>{n.status}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {n.error_message || "—"}
                    </TableCell>
                    <TableCell>{new Date(n.created_at).toLocaleString()}</TableCell>
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
