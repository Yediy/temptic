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
      signerName?: string;
      clientCompany?: string;
      agencyName?: string;
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

      const invite = data as ClientInvite;

      // The token returned from INSERT is the original plaintext token
      // (before the AFTER INSERT trigger hashes it and replaces it with the row ID).
      // We must capture it here — subsequent queries will NOT have the real token.
      const originalToken = invite.token;

      // Resolve agency name for email
      let resolvedAgencyName = input.agencyName;
      if (!resolvedAgencyName && agencyId) {
        const { data: agency } = await supabase.from("agencies").select("name").eq("id", agencyId).single();
        resolvedAgencyName = agency?.name || "Your Agency";
      }

      // Send email notification with onboarding link
      const inviteUrl = `${window.location.origin}/client/onboarding/${originalToken}`;
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "client-invite",
            recipientEmail: input.email,
            idempotencyKey: `client-invite-${invite.id}`,
            templateData: {
              agencyName: resolvedAgencyName || "Your Agency",
              clientCompany: input.clientCompany || "Your Company",
              signerName: input.signerName || "",
              inviteUrl,
            },
          },
        });
      } catch (emailErr) {
        // Don't fail the invite if email fails — invite was already created
        console.error("Failed to send invite email:", emailErr);
      }

      return invite;
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
      // Revoke/expire the old invite if still pending
      if (oldInvite.status === "pending") {
        await supabase
          .from("client_invites")
          .update({ status: "revoked" } as any)
          .eq("id", oldInvite.id);
      }

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

      const invite = data as ClientInvite;

      // Capture original token before trigger hashes it
      const originalToken = invite.token;

      // Send email notification for the new invite
      let resolvedAgencyName: string | undefined;
      if (agencyId) {
        const { data: agency } = await supabase.from("agencies").select("name").eq("id", agencyId).single();
        resolvedAgencyName = agency?.name || "Your Agency";
      }

      const inviteUrl = `${window.location.origin}/client/onboarding/${originalToken}`;
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "client-invite",
            recipientEmail: oldInvite.email,
            idempotencyKey: `client-invite-${invite.id}`,
            templateData: {
              agencyName: resolvedAgencyName || "Your Agency",
              clientCompany: "",
              signerName: "",
              inviteUrl,
            },
          },
        });
      } catch (emailErr) {
        console.error("Failed to send resend invite email:", emailErr);
      }

      return invite;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client_invites"] });
    },
  });
}
