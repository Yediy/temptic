import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function useWorkerTickets() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["worker-tickets", user?.id],
    queryFn: async () => {
      // Worker RLS policy restricts to own tickets automatically
      const { data, error } = await supabase
        .from("tickets")
        .select("id, ticket_number, ticket_type, status, work_date, start_time, total_hours, client_initials, job_title, week_start_date, week_end_date")
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Map to worker-safe view: only initials, no full company name
      return (data ?? []).map(t => ({
        id: t.id,
        ticket_number: t.ticket_number,
        ticket_type: t.ticket_type,
        status: t.status,
        work_date: t.work_date,
        start_time: t.start_time,
        total_hours: t.total_hours,
        client_initials: t.client_initials || "—",
        job_title: t.job_title,
        week_start_date: t.week_start_date,
        week_end_date: t.week_end_date,
      }));
    },
    enabled: !!user,
  });
}

export function useWorkerHoursSummary() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["worker-hours-summary", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("status, total_hours, work_date");
      if (error) throw error;
      const all = data ?? [];
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const weekStr = weekStart.toISOString().slice(0, 10);

      return {
        thisWeekHours: all
          .filter(t => t.work_date && t.work_date >= weekStr && t.status === "signed")
          .reduce((s, t) => s + (Number(t.total_hours) || 0), 0),
        totalSignedTickets: all.filter(t => t.status === "signed").length,
        totalHours: all
          .filter(t => t.status === "signed")
          .reduce((s, t) => s + (Number(t.total_hours) || 0), 0),
        pendingTickets: all.filter(t => ["sent", "viewed"].includes(t.status)).length,
      };
    },
    enabled: !!user,
  });
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map(w => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);
}
