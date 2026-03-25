import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSendTicket() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      const { data, error } = await supabase.functions.invoke("send-ticket", {
        body: { ticket_id: ticketId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["ticket"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useSignTicket() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      ticket_id: string;
      signer_name: string;
      signer_title: string;
      signer_initials: string;
      signer_email?: string;
      signature_image: string;
      signature_date: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("sign-ticket", {
        body: payload,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-tickets"] });
      qc.invalidateQueries({ queryKey: ["client-ticket"] });
      qc.invalidateQueries({ queryKey: ["client-dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["ticket"] });
    },
  });
}

export function useRejectTicket() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      ticket_id: string;
      rejection_reason: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("reject-ticket", {
        body: payload,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-tickets"] });
      qc.invalidateQueries({ queryKey: ["client-ticket"] });
      qc.invalidateQueries({ queryKey: ["client-dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["ticket"] });
    },
  });
}
