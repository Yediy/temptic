import { useState } from "react";
import { useAllClientInvites, useRevokeInvite, useResendInvite, ClientInvite } from "@/hooks/use-client-invites";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { RefreshCw, XCircle, Mail, Loader2, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { format, isPast, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

function statusBadge(invite: ClientInvite) {
  const expired = isPast(new Date(invite.expires_at));
  if (invite.status === "accepted") return <Badge variant="default"><CheckCircle className="mr-1 h-3 w-3" />Accepted</Badge>;
  if (invite.status === "revoked") return <Badge variant="secondary"><XCircle className="mr-1 h-3 w-3" />Revoked</Badge>;
  if (expired) return <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" />Expired</Badge>;
  return <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
}

export default function PendingInvites() {
  const { data: invites = [], isLoading } = useAllClientInvites();
  const revokeInvite = useRevokeInvite();
  const resendInvite = useResendInvite();
  const { toast } = useToast();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Only show actionable invites (pending/expired) for selection
  const pendingInvites = invites.filter(
    (i) => i.status === "pending" || (i.status === "pending" && isPast(new Date(i.expires_at)))
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === pendingInvites.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingInvites.map((i) => i.id)));
    }
  };

  const handleBulkResend = async () => {
    setBulkLoading(true);
    let success = 0;
    for (const id of selected) {
      const invite = invites.find((i) => i.id === id);
      if (invite) {
        try {
          await resendInvite.mutateAsync(invite);
          success++;
        } catch { /* continue */ }
      }
    }
    setBulkLoading(false);
    setSelected(new Set());
    toast({ title: `Resent ${success} invite(s)` });
  };

  const handleBulkRevoke = async () => {
    setBulkLoading(true);
    let success = 0;
    for (const id of selected) {
      try {
        await revokeInvite.mutateAsync(id);
        success++;
      } catch { /* continue */ }
    }
    setBulkLoading(false);
    setSelected(new Set());
    toast({ title: `Revoked ${success} invite(s)` });
  };

  const handleSingleResend = async (invite: ClientInvite) => {
    try {
      await resendInvite.mutateAsync(invite);
      toast({ title: "Invite resent" });
    } catch {
      toast({ title: "Failed to resend", variant: "destructive" });
    }
  };

  const handleSingleRevoke = async (id: string) => {
    try {
      await revokeInvite.mutateAsync(id);
      toast({ title: "Invite revoked" });
    } catch {
      toast({ title: "Failed to revoke", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pending Invites</h1>
          <p className="text-sm text-muted-foreground">
            All client onboarding invitations across your agency
          </p>
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selected.size} selected</span>
            <Button size="sm" variant="outline" onClick={handleBulkResend} disabled={bulkLoading}>
              {bulkLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
              Resend
            </Button>
            <Button size="sm" variant="destructive" onClick={handleBulkRevoke} disabled={bulkLoading}>
              {bulkLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <XCircle className="mr-1 h-3 w-3" />}
              Revoke
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : invites.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Mail className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium">No invites yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Invites will appear here when you invite client signers from the Clients page.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={pendingInvites.length > 0 && selected.size === pendingInvites.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.map((invite) => {
                const isPending = invite.status === "pending";
                const expired = isPast(new Date(invite.expires_at));
                const canAct = isPending;

                return (
                  <TableRow key={invite.id}>
                    <TableCell>
                      {canAct ? (
                        <Checkbox
                          checked={selected.has(invite.id)}
                          onCheckedChange={() => toggleSelect(invite.id)}
                        />
                      ) : (
                        <div className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{invite.email}</TableCell>
                    <TableCell>{statusBadge(invite)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {expired
                        ? "Expired"
                        : format(new Date(invite.expires_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      {canAct && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSingleResend(invite)}
                            disabled={resendInvite.isPending}
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleSingleRevoke(invite.id)}
                            disabled={revokeInvite.isPending}
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
