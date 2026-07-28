import { useParams } from "react-router-dom";
import { useCcNotifications } from "@/hooks/cc/use-client-collab";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export default function NotificationsCenter() {
  const { clientId } = useParams();
  const { data } = useCcNotifications(clientId);
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Notifications</h2>
      <div className="rounded-xl border bg-card divide-y">
        {(data ?? []).map((n) => (
          <div key={n.id} className="flex items-start justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">{n.title}</p>
              <p className="text-xs text-muted-foreground">{n.body}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
              </p>
            </div>
            <Badge variant={n.read_at ? "outline" : "default"}>{n.severity}</Badge>
          </div>
        ))}
        {!data?.length && <p className="p-6 text-sm text-muted-foreground">No notifications.</p>}
      </div>
    </div>
  );
}
