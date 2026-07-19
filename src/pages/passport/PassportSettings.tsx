import { useParams } from "react-router-dom";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { usePermissions, useGrantPermission, useRevokePermission, useApprovePermission, useAccessLog } from "@/hooks/passport/use-workforce-passport";
import { toast } from "@/hooks/use-toast";

export default function PassportSettings() {
  const { passportId } = useParams<{ passportId: string }>();
  const perms = usePermissions(passportId);
  const log = useAccessLog(passportId);
  const grant = useGrantPermission(passportId!);
  const revoke = useRevokePermission(passportId!);
  const approve = useApprovePermission(passportId!);
  const [agencyId, setAgencyId] = useState("");
  const [scopes, setScopes] = useState("identity,skills,certifications");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-sm">Grant Access to an Agency</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Input placeholder="Agency UUID" value={agencyId} onChange={(e) => setAgencyId(e.target.value)} />
          <Input placeholder="Scopes (comma separated)" value={scopes} onChange={(e) => setScopes(e.target.value)} />
          <Button size="sm" onClick={() => {
            if (!agencyId) return;
            grant.mutate({ grantee_type: "agency", grantee_id: agencyId, scopes: scopes.split(",").map(s => s.trim()).filter(Boolean) }, {
              onSuccess: () => { toast({ title: "Access granted" }); setAgencyId(""); },
              onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
            });
          }}>Grant</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Permissions</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(perms.data ?? []).map((p) => (
            <div key={p.id} className="flex items-center justify-between border-b pb-2 last:border-0 text-sm">
              <div>
                <div className="font-medium">{p.grantee_type} · {p.grantee_id ?? "external"}</div>
                <div className="text-xs text-muted-foreground">Scopes: {(p.scopes ?? []).join(", ") || "—"} · Expires: {p.expires_at ? new Date(p.expires_at).toLocaleDateString() : "Never"}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge>
                {p.status === "pending" && <Button size="sm" variant="outline" onClick={() => approve.mutate(p.id)}>Approve</Button>}
                {p.status !== "revoked" && <Button size="sm" variant="destructive" onClick={() => revoke.mutate(p.id)}>Revoke</Button>}
              </div>
            </div>
          ))}
          {(perms.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No permissions granted.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Access Log</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          {(log.data ?? []).map((l) => (
            <div key={l.id} className="flex justify-between border-b py-1 last:border-0">
              <span>{l.action} · {l.resource ?? ""}</span>
              <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
            </div>
          ))}
          {(log.data ?? []).length === 0 && <p className="text-muted-foreground">No access events.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
