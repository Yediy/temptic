import { useState, useMemo } from "react";
import { useAllClientInvites, useRevokeInvite, useResendInvite, ClientInvite } from "@/hooks/use-client-invites";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { RefreshCw, XCircle, Mail, Loader2, CheckCircle, Clock, AlertTriangle, Search } from "lucide-react";
import { format, isPast, formatDistanceToNow, addHours, isBefore } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

export function getEffectiveStatus(invite: ClientInvite) {
  if (invite.status === "accepted") return "accepted";
  if (invite.status === "revoked") return "revoked";
  if (invite.status === "expired") return "expired";
  if (invite.status === "pending" && isPast(new Date(invite.expires_at))) return "expired";
  return "pending";
}

function statusBadge(invite: ClientInvite) {
  const status = getEffectiveStatus(invite);
  if (status === "accepted") return <Badge variant="default"><CheckCircle className="mr-1 h-3 w-3" />Accepted</Badge>;
  if (status === "revoked") return <Badge variant="secondary"><XCircle className="mr-1 h-3 w-3" />Revoked</Badge>;
  if (status === "expired") return <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" />Expired</Badge>;
  return <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
}

export default function PendingInvites() {
  const { data: invites = [], isLoading } = useAllClientInvites();
  const revokeInvite = useRevokeInvite();
  const resendInvite = useResendInvite();
  const { toast } = useToast();
  const { agencyId } = useAuth();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");

  // Fetch client names for filter dropdown
  const { data: clients = [] } = useQuery({
    queryKey: ["clients_for_invites", agencyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, company_name")
        .order("company_name");
      return data ?? [];
    },
    enabled: !!agencyId,
  });

  // Build client lookup
  const clientMap = useMemo(() => {
    const map: Record<string, string> = {};
    clients.forEach((c) => { map[c.id] = c.company_name; });
    return map;
  }, [clients]);

  // Filter invites
  const filteredInvites = useMemo(() => {
    return invites.filter((inv) => {
      const effectiveStatus = getEffectiveStatus(inv);

      if (statusFilter !== "all" && effectiveStatus !== statusFilter) return false;
      if (clientFilter !== "all" && inv.client_id !== clientFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const clientName = clientMap[inv.client_id]?.toLowerCase() || "";
        if (!inv.email.toLowerCase().includes(q) && !clientName.includes(q)) return false;
      }
      return true;
    });
  }, [invites, statusFilter, clientFilter, searchQuery, clientMap]);

  // Actionable invites: pending OR expired (can resend expired)
  const actionableInvites = filteredInvites.filter((i) => {
    const s = getEffectiveStatus(i);
    return s === "pending" || s === "expired";
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === actionableInvites.length && actionableInvites.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(actionableInvites.map((i) => i.id)));
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
      const eff = getEffectiveStatus(invites.find((i) => i.id === id)!);
      if (eff !== "pending") continue; // Can only revoke truly pending
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

  // Stats
  const pendingCount = invites.filter((i) => getEffectiveStatus(i) === "pending").length;
  const expiredCount = invites.filter((i) => getEffectiveStatus(i) === "expired").length;
  const acceptedCount = invites.filter((i) => getEffectiveStatus(i) === "accepted").length;

  // Expiring soon (within 24 hours)
  const now = new Date();
  const soonThreshold = addHours(now, 24);
  const expiringSoon = invites.filter((i) => {
    if (getEffectiveStatus(i) !== "pending") return false;
    const exp = new Date(i.expires_at);
    return isBefore(exp, soonThreshold) && !isPast(exp);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pending Invites</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Loading…"
              : `${invites.length} total · ${pendingCount} pending · ${expiredCount} expired · ${acceptedCount} accepted`}
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

      {expiringSoon.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Expiring soon</AlertTitle>
          <AlertDescription>
            {expiringSoon.length} invite{expiringSoon.length > 1 ? "s" : ""} will expire in the next 24 hours:{" "}
            {expiringSoon.map((inv) => inv.email).join(", ")}.
            Consider resending before they expire.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email or client…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
          </SelectContent>
        </Select>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredInvites.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Mail className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium">
            {invites.length === 0 ? "No invites yet" : "No invites match your filters"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {invites.length === 0
              ? "Invites will appear here when you invite client signers from the Clients page."
              : "Try adjusting your search or filters."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={actionableInvites.length > 0 && selected.size === actionableInvites.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvites.map((invite) => {
                const effectiveStatus = getEffectiveStatus(invite);
                const isPending = effectiveStatus === "pending";
                const isExpired = effectiveStatus === "expired";
                const canSelect = isPending || isExpired;

                return (
                  <TableRow key={invite.id} className={isExpired ? "opacity-75" : ""}>
                    <TableCell>
                      {canSelect ? (
                        <Checkbox
                          checked={selected.has(invite.id)}
                          onCheckedChange={() => toggleSelect(invite.id)}
                        />
                      ) : (
                        <div className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{invite.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {clientMap[invite.client_id] || "—"}
                    </TableCell>
                    <TableCell>{statusBadge(invite)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {effectiveStatus === "expired"
                        ? "Expired"
                        : effectiveStatus === "accepted" || effectiveStatus === "revoked"
                        ? "—"
                        : format(new Date(invite.expires_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Resend: available for pending and expired */}
                        {(isPending || isExpired) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Resend invite"
                            onClick={() => handleSingleResend(invite)}
                            disabled={resendInvite.isPending}
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        )}
                        {/* Revoke: only for truly pending */}
                        {isPending && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            title="Revoke invite"
                            onClick={() => handleSingleRevoke(invite.id)}
                            disabled={revokeInvite.isPending}
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
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
