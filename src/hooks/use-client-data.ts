import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function useClientTickets() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["client-tickets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

export function useClientTicket(ticketId?: string) {
  return useQuery({
    queryKey: ["client-ticket", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("id", ticketId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!ticketId,
  });
}

export function useSignTicket() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ ticketId, signerName, signerTitle }: { ticketId: string; signerName: string; signerTitle?: string }) => {
      // 1. Insert signature record
      const { error: sigError } = await supabase
        .from("ticket_signatures")
        .insert({
          ticket_id: ticketId,
          signer_type: "client" as const,
          signer_name: signerName,
          signer_title: signerTitle || null,
          signed_at: new Date().toISOString(),
        });
      if (sigError) throw sigError;

      // 2. Update ticket status
      const { error: ticketError } = await supabase
        .from("tickets")
        .update({
          status: "signed" as const,
          signed_at: new Date().toISOString(),
          supervisor_name: signerName,
          supervisor_title: signerTitle || null,
        })
        .eq("id", ticketId);
      if (ticketError) throw ticketError;

      // 3. Generate PDF documents
      const pdfTypes = ["agency_copy", "client_copy", "worker_copy"] as const;
      for (const pdfType of pdfTypes) {
        await supabase.functions.invoke("generate-pdf", {
          body: { ticket_id: ticketId, pdf_type: pdfType },
        });
      }

      // 4. Send "ticket signed" email to agency
      const { data: ticket } = await supabase
        .from("tickets")
        .select("ticket_number, worker_name_snapshot, agency_id")
        .eq("id", ticketId)
        .single();

      if (ticket) {
        const { data: agency } = await supabase
          .from("agencies")
          .select("email")
          .eq("id", ticket.agency_id)
          .single();

        if (agency?.email) {
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "ticket-signed",
              recipientEmail: agency.email,
              idempotencyKey: `ticket-signed-${ticketId}`,
              templateData: {
                ticketNumber: ticket.ticket_number,
                workerName: ticket.worker_name_snapshot,
                signerName,
                signedAt: new Date().toLocaleString(),
              },
            },
          });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-tickets"] });
      qc.invalidateQueries({ queryKey: ["client-ticket"] });
    },
  });
}

export function useRejectTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, reason }: { ticketId: string; reason: string }) => {
      const { error } = await supabase
        .from("tickets")
        .update({
          status: "rejected" as const,
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq("id", ticketId);
      if (error) throw error;

      // Send "ticket rejected" email to agency
      const { data: ticket } = await supabase
        .from("tickets")
        .select("ticket_number, worker_name_snapshot, agency_id")
        .eq("id", ticketId)
        .single();

      if (ticket) {
        const { data: agency } = await supabase
          .from("agencies")
          .select("email")
          .eq("id", ticket.agency_id)
          .single();

        if (agency?.email) {
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "ticket-rejected",
              recipientEmail: agency.email,
              idempotencyKey: `ticket-rejected-${ticketId}`,
              templateData: {
                ticketNumber: ticket.ticket_number,
                workerName: ticket.worker_name_snapshot,
                rejectedBy: "Client",
                reason,
              },
            },
          });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-tickets"] });
      qc.invalidateQueries({ queryKey: ["client-ticket"] });
    },
  });
}

export function useClientDashboardStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["client-dashboard-stats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("status, signed_at");
      if (error) throw error;
      const all = data ?? [];
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const weekStr = weekStart.toISOString();

      return {
        pending: all.filter(t => ["sent", "viewed"].includes(t.status)).length,
        signedThisWeek: all.filter(t => t.status === "signed" && t.signed_at && t.signed_at >= weekStr).length,
        rejected: all.filter(t => t.status === "rejected").length,
      };
    },
    enabled: !!user,
  });
}
