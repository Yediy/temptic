import { useParams } from "react-router-dom";
import { useCcClientUsers } from "@/hooks/cc/use-client-collab";
import { Badge } from "@/components/ui/badge";

export default function Permissions() {
  const { clientId } = useParams();
  const { data } = useCcClientUsers(clientId);
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Permissions</h2>
      <p className="text-sm text-muted-foreground">
        Manage which client users have access to this workspace. Contact your agency admin to add new users.
      </p>
      <div className="rounded-xl border bg-card divide-y">
        {(data ?? []).map((u) => (
          <div key={u.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium font-mono">{u.user_id.slice(0, 12)}…</p>
              <p className="text-xs text-muted-foreground">Status: {u.status}</p>
            </div>
            <Badge variant="outline">{u.role}</Badge>
          </div>
        ))}
        {!data?.length && <p className="p-6 text-sm text-muted-foreground">No client users configured yet.</p>}
      </div>
    </div>
  );
}
