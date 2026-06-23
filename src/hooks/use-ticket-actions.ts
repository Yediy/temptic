import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthGuardedAction } from "@/hooks/use-auth-guarded-action";
import { Sentry, trackStep } from "@/instrument";

async function invokeWithBreadcrumb<T>(
  fn: string,
  body: Record<string, unknown>,
  ticketId: string,
): Promise<T> {
  trackStep("ticket", `${fn} start`, { ticket_id: ticketId });
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    trackStep("ticket", `${fn} failed`, { ticket_id: ticketId, message: error.message }, "error");
    Sentry.captureException(error, {
      tags: { feature: "ticket_action", action: fn, ticket_id: ticketId },
    });
    throw error;
  }
  trackStep("ticket", `${fn} success`, { ticket_id: ticketId });
  return data as T;
}

export function useSendTicket() {
  const qc = useQueryClient();
  const guard = useAuthGuardedAction();

  return useMutation({
    mutationFn: async (ticketId: string) =>
      guard(() => invokeWithBreadcrumb("send-ticket", { ticket_id: ticketId }, ticketId)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["ticket"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useSignTicket() {
  const qc = useQueryClient();
  const guard = useAuthGuardedAction();

  return useMutation({
    mutationFn: async (payload: {
      ticket_id: string;
      signer_name: string;
      signer_title: string;
      signer_initials: string;
      signer_email?: string;
      signature_image: string;
      signature_date: string;
    }) =>
      guard(() => invokeWithBreadcrumb("sign-ticket", payload, payload.ticket_id)),
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
  const guard = useAuthGuardedAction();

  return useMutation({
    mutationFn: async (payload: { ticket_id: string; rejection_reason: string }) =>
      guard(() => invokeWithBreadcrumb("reject-ticket", payload, payload.ticket_id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-tickets"] });
      qc.invalidateQueries({ queryKey: ["client-ticket"] });
      qc.invalidateQueries({ queryKey: ["client-dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["ticket"] });
    },
  });
}
