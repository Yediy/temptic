import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useWoicIdentity, useWoicIdentityMemberships } from "@/hooks/use-woic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function WoicIdentity() {
  const { agencyId } = useAuth();
  const [identityId, setIdentityId] = useState("");
  const memberships = useWoicIdentityMemberships(agencyId ?? undefined);
  const identity = useWoicIdentity(agencyId ?? undefined, identityId || undefined);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Identity Memberships</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {memberships.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {memberships.data?.length === 0 && <p className="text-sm text-muted-foreground">No memberships found.</p>}
          {memberships.data?.map((m: any) => (
            <button
              key={m.id}
              onClick={() => setIdentityId(m.identity_id)}
              className="w-full text-left flex items-center justify-between rounded-md border p-2 hover:bg-muted"
            >
              <div>
                <p className="text-xs font-mono">{m.identity_id.slice(0, 8)}…</p>
                <p className="text-xs text-muted-foreground">{m.kind}</p>
              </div>
              <Badge variant={m.status === "active" ? "default" : "secondary"}>{m.status}</Badge>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Identity Lookup</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Paste identity UUID"
            value={identityId}
            onChange={(e) => setIdentityId(e.target.value.trim())}
          />
          {identity.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {identity.data && (
            <pre className="text-xs bg-muted rounded-md p-3 overflow-auto max-h-96">
              {JSON.stringify(identity.data, null, 2)}
            </pre>
          )}
          {identityId && !identity.isLoading && !identity.data && (
            <p className="text-sm text-muted-foreground">No identity found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
