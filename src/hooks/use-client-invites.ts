import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface ClientInvite {
  id: string;
  agency_id: string;
  client_id: string;
  client_signer_id: string;
  email: string;
  token: string;
  status: string;
  expires_at: string;
  accepted_at: string | null;
  created_by: string | null;
  created_at: string;
}

export function useClientInvites(clientId?: string) {
  return useQuery({
    queryKey: ["client_invites", clientId],
    queryFn: async () => {
      let q = supabase
        .from("client_invites")
        .select("*")
        .order("created_at", { ascending: false });
      if (clientId) q = q.eq("client_id", clientId);
      const { data, error } = await q;
      if (error) throw error;
      return data as ClientInvite[];
    },
    enabled: !!clientId,
  });
}

export function useAllClientInvites() {
  const { agencyId } = useAuth();
  return useQuery({
    queryKey: ["client_invites", "all", agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_invites")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ClientInvite[];
    },
    enabled: !!agencyId,
  });
}

export function useSendInvite() {
  const qc = useQueryClient();
  const { agencyId, user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      client_id: string;
      client_signer_id: string;
      email: string;
    }) => {
      const { data, error } = await supabase
        .from("client_invites")
        .insert({
          agency_id: agencyId!,
          client_id: input.client_id,
          client_signer_id: input.client_signer_id,
          email: input.email,
          created_by: user?.id ?? null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as ClientInvite;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["client_invites"] });
      qc.invalidateQueries({ queryKey: ["client_signers", vars.client_id] });
    },
  });
}

export function useRevokeInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from("client_invites")
        .update({ status: "revoked" } as any)
        .eq("id", inviteId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client_invites"] });
    },
  });
}

export function useResendInvite() {
  const qc = useQueryClient();
  const { agencyId, user } = useAuth();

  return useMutation({
    mutationFn: async (oldInvite: ClientInvite) => {
      // Revoke the old invite
      await supabase
        .from("client_invites")
        .update({ status: "revoked" } as any)
        .eq("id", oldInvite.id);

      // Create a new one
      const { data, error } = await supabase
        .from("client_invites")
        .insert({
          agency_id: agencyId!,
          client_id: oldInvite.client_id,
          client_signer_id: oldInvite.client_signer_id,
          email: oldInvite.email,
          created_by: user?.id ?? null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as ClientInvite;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client_invites"] });
    },
  });
}
