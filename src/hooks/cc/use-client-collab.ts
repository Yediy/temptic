import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// ---------- COMMAND CENTER (aggregated) ------------------------------------
export function useCommandCenter(clientId?: string) {
  return useQuery({
    enabled: !!clientId,
    queryKey: ["cc", "cmd", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const [orders, placements, tickets, invoices, requests, notifications, activity, recs] = await Promise.all([
        supabase.from("job_orders").select("id, status").eq("client_id", clientId),
        supabase.from("placements").select("id, status, job_order:job_orders!inner(client_id)").eq("job_order.client_id", clientId),
        supabase.from("tto_time_tickets").select("id, status").eq("client_id", clientId),
        supabase.from("pb_invoices").select("id, status, total").eq("client_id", clientId),
        supabase.from("cc_requests").select("id, status").eq("client_id", clientId),
        supabase.from("cc_notifications").select("id, read_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(50),
        supabase.from("cc_activities").select("*").eq("client_id", clientId).order("created_at", { ascending: false }).limit(10),
        supabase.from("woic_recommendations").select("id, kind, reasoning, score").eq("subject_entity", "client").eq("subject_id", clientId).order("score", { ascending: false }).limit(5),
      ]);
      const o = orders.data ?? [];
      const t = tickets.data ?? [];
      const i = invoices.data ?? [];
      const p = placements.data ?? [];
      return {
        openOrders: o.filter((x) => x.status === "open").length,
        openPositions: o.filter((x) => ["open","on_hold"].includes(x.status)).length,
        assigned: p.length,
        pendingApprovals: t.filter((x) => x.status === "submitted").length,
        ticketsAwaiting: t.filter((x) => x.status === "submitted").length,
        invoicesOpen: i.filter((x) => !["paid","void"].includes(x.status)).length,
        openRequests: (requests.data ?? []).filter((r) => r.status !== "closed" && r.status !== "resolved").length,
        alerts: (notifications.data ?? []).filter((n) => !n.read_at).length,
        activity: activity.data ?? [],
        recommendations: recs.data ?? [],
      };
    },
  });
}

// ---------- MESSAGES / THREADS ---------------------------------------------
export function useCcThreads(clientId?: string) {
  return useQuery({
    enabled: !!clientId,
    queryKey: ["cc", "threads", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("cc_threads").select("*").eq("client_id", clientId!).order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCcMessages(threadId?: string) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!threadId) return;
    const ch = supabase.channel(`cc-msg-${threadId}`).on("postgres_changes", { event: "*", schema: "public", table: "cc_messages", filter: `thread_id=eq.${threadId}` }, () => {
      qc.invalidateQueries({ queryKey: ["cc", "messages", threadId] });
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [threadId, qc]);
  return useQuery({
    enabled: !!threadId,
    queryKey: ["cc", "messages", threadId],
    queryFn: async () => {
      const { data, error } = await supabase.from("cc_messages").select("*").eq("thread_id", threadId!).order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { thread_id: string; body: string; sender_kind?: string }) => {
      const { data, error } = await supabase.functions.invoke("cc-send-message", { body: input });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["cc", "messages", v.thread_id] }),
  });
}

export function useCreateThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { client_id: string; agency_id: string; kind?: string; subject?: string }) => {
      const { data, error } = await supabase.from("cc_threads").insert({
        client_id: input.client_id, agency_id: input.agency_id,
        kind: (input.kind ?? "agency") as "agency"|"worker"|"group",
        subject: input.subject ?? "New conversation",
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["cc", "threads", v.client_id] }),
  });
}

export function useSummarizeThread() {
  return useMutation({
    mutationFn: async (thread_id: string) => {
      const { data, error } = await supabase.functions.invoke("cc-summarize-thread", { body: { thread_id } });
      if (error) throw error;
      return data as { data: { summary: string } };
    },
  });
}

// ---------- DOCUMENTS -------------------------------------------------------
export function useCcDocuments(clientId?: string) {
  return useQuery({
    enabled: !!clientId,
    queryKey: ["cc", "docs", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("cc_documents").select("*").eq("client_id", clientId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useUploadCcDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { client_id: string; file: File; category?: string }) => {
      const { data, error } = await supabase.functions.invoke("cc-upload-document", {
        body: { client_id: input.client_id, name: input.file.name, category: input.category ?? "other" },
      });
      if (error) throw error;
      const upload = data.data.upload as { signedUrl: string; token: string; path: string };
      const put = await fetch(upload.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": input.file.type || "application/octet-stream" },
        body: input.file,
      });
      if (!put.ok) throw new Error("Upload failed");
      return data.data.document;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["cc", "docs", v.client_id] }),
  });
}

// ---------- REQUESTS --------------------------------------------------------
export function useCcRequests(clientId?: string) {
  return useQuery({
    enabled: !!clientId,
    queryKey: ["cc", "requests", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("cc_requests").select("*").eq("client_id", clientId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCcRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { client_id: string; kind: string; subject: string; body?: string; priority?: string }) => {
      const { data, error } = await supabase.functions.invoke("cc-create-request", { body: input });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["cc", "requests", v.client_id] }),
  });
}

// ---------- NOTIFICATIONS ---------------------------------------------------
export function useCcNotifications(clientId?: string) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!clientId) return;
    const ch = supabase.channel(`cc-notif-${clientId}`).on("postgres_changes", { event: "*", schema: "public", table: "cc_notifications", filter: `client_id=eq.${clientId}` }, () => {
      qc.invalidateQueries({ queryKey: ["cc", "notifications", clientId] });
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clientId, qc]);
  return useQuery({
    enabled: !!clientId,
    queryKey: ["cc", "notifications", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("cc_notifications").select("*").eq("client_id", clientId!).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });
}

// ---------- ACTIVITY / ANALYTICS -------------------------------------------
export function useCcActivities(clientId?: string) {
  return useQuery({
    enabled: !!clientId,
    queryKey: ["cc", "activities", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("cc_activities").select("*").eq("client_id", clientId!).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });
}

export function useCcAnalytics(clientId?: string) {
  return useQuery({
    enabled: !!clientId,
    queryKey: ["cc", "analytics", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("cc_analytics_snapshots").select("*").eq("client_id", clientId!).order("created_at", { ascending: false }).limit(12);
      if (error) throw error;
      return data;
    },
  });
}

export function useGenerateAnalytics() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { client_id: string; period_days?: number }) => {
      const { data, error } = await supabase.functions.invoke("cc-generate-analytics", { body: input });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["cc", "analytics", v.client_id] }),
  });
}

// ---------- ADVISOR (WOIC) --------------------------------------------------
export function useClientAdvisor(clientId?: string) {
  return useQuery({
    enabled: !!clientId,
    queryKey: ["cc", "advisor", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("cc-client-advisor", { body: { client_id: clientId } });
      if (error) throw error;
      return data as { data: { recommendations: Array<{ id: string; kind?: string; title?: string; reasoning?: string; body?: string; score: number }> } };
    },
  });
}

// ---------- PERMISSIONS / USERS --------------------------------------------
export function useCcClientUsers(clientId?: string) {
  return useQuery({
    enabled: !!clientId,
    queryKey: ["cc", "users", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("cc_client_users").select("*").eq("client_id", clientId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCcPermissions(clientId?: string) {
  return useQuery({
    enabled: !!clientId,
    queryKey: ["cc", "perms", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("cc_permissions").select("*").eq("client_id", clientId!);
      if (error) throw error;
      return data;
    },
  });
}

// ---------- APPROVALS -------------------------------------------------------
export function useCcApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { target: string; id: string; decision: "approve"|"reject"; note?: string }) => {
      const { data, error } = await supabase.functions.invoke("cc-approve", { body: input });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cc"] }),
  });
}
