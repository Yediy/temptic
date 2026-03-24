import { useQuery } from "@tanstack/react-query";
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
        .select("*, ticket_days(*)")
        .eq("id", ticketId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!ticketId,
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
