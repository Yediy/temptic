import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useWoicIdentity, useWoicIdentityMemberships } from "@/hooks/use-woic";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DataPanel,
  DataPanelColumn,
  DetailField,
  DetailJson,
  fmtDate,
  short,
} from "@/components/woic/DataPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState, ErrorState } from "@/components/woic/AsyncState";
import type { WoicIdentity, WoicIdentityMembership } from "@/lib/woic/types";

const membershipColumns: DataPanelColumn<WoicIdentityMembership>[] = [
  { key: "id", header: "Identity", cell: (r) => <span className="font-mono text-xs">{short(r.identity_id)}</span> },
  { key: "kind", header: "Kind", cell: (r) => r.kind },
  {
    key: "status",
    header: "Status",
    cell: (r) => <Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge>,
  },
  { key: "created_at", header: "Joined", cell: (r) => fmtDate(r.created_at) },
];

export default function WoicIdentityPage() {
  const { agencyId } = useAuth();
  const [identityId, setIdentityId] = useState("");
  const memberships = useWoicIdentityMemberships(agencyId ?? undefined);
  const identity = useWoicIdentity(agencyId ?? undefined, identityId || undefined);

  return (
    <div className="space-y-4">
      <DataPanel<WoicIdentityMembership>
        title="Identity Memberships"
        description="Workforce identities linked to this agency."
        columns={membershipColumns}
        rows={memberships.data as WoicIdentityMembership[] | undefined}
        isLoading={memberships.isLoading}
        error={memberships.error}
        emptyLabel="No memberships found."
        detailTitle={(r) => `Membership ${short(r.identity_id)}`}
        renderDetail={(m) => (
          <div className="space-y-1">
            <DetailField label="Identity ID" value={<span className="font-mono text-xs">{m.identity_id}</span>} />
            <DetailField label="Kind" value={m.kind} />
            <DetailField label="Status" value={<Badge variant={m.status === "active" ? "default" : "secondary"}>{m.status}</Badge>} />
            <DetailField label="Joined" value={fmtDate(m.created_at)} />
            <DetailJson label="Metadata" value={m.metadata} />
            <button
              className="text-xs text-primary hover:underline mt-2"
              onClick={() => setIdentityId(m.identity_id)}
            >
              Load full identity →
            </button>
          </div>
        )}
      />

      <Card>
        <CardHeader><CardTitle>Identity Lookup</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Paste identity UUID"
            value={identityId}
            onChange={(e) => setIdentityId(e.target.value.trim())}
          />
          {identity.isLoading && <LoadingState />}
          {identity.error && <ErrorState error={identity.error} />}
          {identity.data && (() => {
            const d = identity.data as WoicIdentity;
            return (
              <div>
                <DetailField label="Display Name" value={d.display_name} />
                <DetailField label="Email" value={d.primary_email} />
                <DetailField label="Phone" value={d.primary_phone} />
                <DetailField label="Reputation" value={d.reputation_score ?? "—"} />
                <DetailField label="Activity" value={d.activity_score ?? "—"} />
                <DetailJson label="Skills" value={d.skills} />
                <DetailJson label="Certifications" value={d.certifications} />
                <DetailJson label="Availability" value={d.availability} />
              </div>
            );
          })()}
          {identityId && !identity.isLoading && !identity.error && !identity.data && (
            <p className="text-sm text-muted-foreground">No identity found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
