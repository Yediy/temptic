// IWOS Phase 5.6B — Communications Workspace data layer.
// Read/write access ONLY through the existing Communication Fabric tables and
// the existing WOIC cognitive edge function. No new business logic lives here.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cognitive } from "@/hooks/woic/use-cognitive";
import {
  channelForModule, decodeSubject, encodeSubject, normalizePriority,
  DEFAULT_TEMPLATES, type AssistantTask, type CommChannel, type ConversationScope, type Priority,
} from "@/lib/comms/fabric";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type CommThread = {
  id: string;
  agency_id: string;
  subject: string | null;
  participants: string[];
  created_by: string | null;
  created_at: string;
  last_message_at: string | null;
  scope: ConversationScope;
  title: string;
};

export type CommMessage = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  attachments: unknown;
  read_by: string[];
  created_at: string;
};

export type CommNotification = {
  id: string;
  agency_id: string;
  recipient_id: string;
  title: string;
  body: string | null;
  level: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export type CommEvent = {
  id: string;
  module: string;
  name: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  actor_id: string | null;
};

export type CommTask = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_at: string | null;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
};

export type InboxItem = {
  id: string;
  kind: "message" | "notification" | "event";
  channel: CommChannel;
  priority: Priority;
  title: string;
  preview: string;
  at: string;
  unread: boolean;
  href?: string;
  entityType?: string | null;
  entityId?: string | null;
};

/* ------------------------------------------------------------------ */
/* Conversations                                                       */
/* ------------------------------------------------------------------ */

function decorateThread(row: Record<string, unknown>): CommThread {
  const raw = (row.subject as string | null) ?? null;
  const { scope, subject } = decodeSubject(raw);
  return { ...(row as unknown as CommThread), scope, title: subject };
}

export function useCommThreads() {
  const { agencyId, user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!agencyId) return;
    const ch = supabase
      .channel(`comms-threads-${agencyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ttos_message_threads" }, () => {
        qc.invalidateQueries({ queryKey: ["comms", "threads"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [agencyId, qc]);

  return useQuery({
    queryKey: ["comms", "threads", agencyId, user?.id],
    enabled: !!agencyId && !!user?.id,
    queryFn: async (): Promise<CommThread[]> => {
      const { data, error } = await supabase
        .from("ttos_message_threads")
        .select("*")
        .eq("agency_id", agencyId!)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []).map((r) => decorateThread(r as unknown as Record<string, unknown>));
    },
  });
}

export function useCommMessages(threadId?: string) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!threadId) return;
    const ch = supabase
      .channel(`comms-msgs-${threadId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ttos_messages", filter: `thread_id=eq.${threadId}` },
        () => qc.invalidateQueries({ queryKey: ["comms", "messages", threadId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [threadId, qc]);

  return useQuery({
    queryKey: ["comms", "messages", threadId],
    enabled: !!threadId,
    queryFn: async (): Promise<CommMessage[]> => {
      const { data, error } = await supabase
        .from("ttos_messages")
        .select("*")
        .eq("thread_id", threadId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CommMessage[];
    },
  });
}

export function useCreateCommThread() {
  const { agencyId, user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { subject: string; scope: ConversationScope; participants?: string[] }) => {
      if (!agencyId || !user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("ttos_message_threads")
        .insert({
          agency_id: agencyId,
          subject: encodeSubject(vars.scope, vars.subject),
          participants: Array.from(new Set([user.id, ...(vars.participants ?? [])])),
          created_by: user.id,
        })
        .select("*")
        .single();
      if (error) throw error;
      return decorateThread(data as unknown as Record<string, unknown>);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comms", "threads"] }),
  });
}

export function useSendCommMessage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { thread_id: string; body: string; attachments?: unknown[] }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("ttos_messages").insert({
        thread_id: vars.thread_id,
        sender_id: user.id,
        body: vars.body.trim(),
        attachments: (vars.attachments ?? []) as never,
      });
      if (error) throw error;
      await supabase
        .from("ttos_message_threads")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", vars.thread_id);
      return true;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["comms", "messages", v.thread_id] });
      qc.invalidateQueries({ queryKey: ["comms", "threads"] });
    },
  });
}

export function useMarkThreadRead() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (messages: CommMessage[]) => {
      if (!user) return false;
      const unread = messages.filter((m) => !(m.read_by ?? []).includes(user.id));
      await Promise.all(
        unread.map((m) =>
          supabase
            .from("ttos_messages")
            .update({ read_by: [...(m.read_by ?? []), user.id] })
            .eq("id", m.id),
        ),
      );
      return true;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comms", "messages"] }),
  });
}

/** Latest message per thread — used by inbox previews and analytics. */
export function useRecentMessages(limit = 400) {
  const { agencyId } = useAuth();
  const threads = useCommThreads();
  const ids = useMemo(() => (threads.data ?? []).map((t) => t.id), [threads.data]);
  return useQuery({
    queryKey: ["comms", "recent-messages", agencyId, ids.length, limit],
    enabled: ids.length > 0,
    queryFn: async (): Promise<CommMessage[]> => {
      const { data, error } = await supabase
        .from("ttos_messages")
        .select("*")
        .in("thread_id", ids)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as CommMessage[];
    },
  });
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export function useCommNotifications(limit = 200) {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`comms-notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ttos_notifications", filter: `recipient_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["comms", "notifications"] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);

  return useQuery({
    queryKey: ["comms", "notifications", user?.id, limit],
    enabled: !!user?.id,
    queryFn: async (): Promise<CommNotification[]> => {
      const { data, error } = await supabase
        .from("ttos_notifications")
        .select("*")
        .eq("recipient_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as CommNotification[];
    },
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!ids.length) return true;
      const { error } = await supabase
        .from("ttos_notifications")
        .update({ read_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
      return true;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comms", "notifications"] }),
  });
}

/* ------------------------------------------------------------------ */
/* Fabric events (broadcast / announcement / history sources)          */
/* ------------------------------------------------------------------ */

export function useCommEvents(limit = 300, modules?: string[]) {
  const { agencyId } = useAuth();
  return useQuery({
    queryKey: ["comms", "events", agencyId, limit, modules?.join(",")],
    enabled: !!agencyId,
    queryFn: async (): Promise<CommEvent[]> => {
      let q = supabase
        .from("ttos_events")
        .select("id, module, name, entity_type, entity_id, metadata, created_at, actor_id")
        .eq("agency_id", agencyId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (modules?.length) q = q.in("module", modules);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as CommEvent[];
    },
  });
}

/* ------------------------------------------------------------------ */
/* Tasks (shared with TTOS task engine)                                */
/* ------------------------------------------------------------------ */

export function useCommTasks(status: "open" | "done" | "all" = "open") {
  const { agencyId } = useAuth();
  return useQuery({
    queryKey: ["comms", "tasks", agencyId, status],
    enabled: !!agencyId,
    queryFn: async (): Promise<CommTask[]> => {
      let q = supabase
        .from("ttos_tasks")
        .select("*")
        .eq("agency_id", agencyId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (status !== "all") q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as CommTask[];
    },
  });
}

export function useCreateCommTask() {
  const { agencyId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      title: string; description?: string; priority?: string;
      due_at?: string | null; entity_type?: string | null; entity_id?: string | null;
    }) => {
      if (!agencyId) throw new Error("Not authenticated");
      const { error } = await supabase.from("ttos_tasks").insert({
        agency_id: agencyId,
        title: vars.title,
        description: vars.description ?? null,
        priority: vars.priority ?? "medium",
        due_at: vars.due_at ?? null,
        entity_type: vars.entity_type ?? null,
        entity_id: vars.entity_id ?? null,
      });
      if (error) throw error;
      return true;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comms", "tasks"] }),
  });
}

export function useUpdateCommTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; status?: string; priority?: string }) => {
      const { id, ...patch } = vars;
      const { error } = await supabase.from("ttos_tasks").update(patch).eq("id", id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comms", "tasks"] }),
  });
}

/* ------------------------------------------------------------------ */
/* Unified inbox — merge of every fabric source                        */
/* ------------------------------------------------------------------ */

export function useUnifiedInbox() {
  const threads = useCommThreads();
  const messages = useRecentMessages();
  const notifications = useCommNotifications();
  const events = useCommEvents(200);
  const { user } = useAuth();

  const items = useMemo<InboxItem[]>(() => {
    const out: InboxItem[] = [];
    const threadById = new Map((threads.data ?? []).map((t) => [t.id, t]));

    for (const m of messages.data ?? []) {
      const t = threadById.get(m.thread_id);
      out.push({
        id: `msg-${m.id}`,
        kind: "message",
        channel: "internal",
        priority: "medium",
        title: t?.title ?? "Conversation",
        preview: m.body,
        at: m.created_at,
        unread: !!user && m.sender_id !== user.id && !(m.read_by ?? []).includes(user.id),
        href: `/comms/conversations?thread=${m.thread_id}`,
      });
    }

    for (const n of notifications.data ?? []) {
      out.push({
        id: `notif-${n.id}`,
        kind: "notification",
        channel: channelForModule(n.entity_type ?? String((n.metadata as { module?: string })?.module ?? ""), "system"),
        priority: normalizePriority(n.level),
        title: n.title,
        preview: n.body ?? "",
        at: n.created_at,
        unread: !n.read_at,
        entityType: n.entity_type,
        entityId: n.entity_id,
        href: "/comms/notifications",
      });
    }

    for (const e of events.data ?? []) {
      out.push({
        id: `evt-${e.id}`,
        kind: "event",
        channel: channelForModule(e.module, "workflow"),
        priority: e.name.includes("fail") || e.name.includes("error") ? "high" : "low",
        title: e.name.replace(/[._]/g, " "),
        preview: `${e.module}${e.entity_type ? ` · ${e.entity_type}` : ""}`,
        at: e.created_at,
        unread: false,
        entityType: e.entity_type,
        entityId: e.entity_id,
        href: "/comms/history",
      });
    }

    return out.sort((a, b) => +new Date(b.at) - +new Date(a.at));
  }, [threads.data, messages.data, notifications.data, events.data, user]);

  return {
    items,
    isLoading: threads.isLoading || notifications.isLoading || events.isLoading,
    unreadCount: items.filter((i) => i.unread).length,
  };
}

/* ------------------------------------------------------------------ */
/* Universal communication search                                      */
/* ------------------------------------------------------------------ */

export function useCommSearch(query: string, mode: "keyword" | "semantic" | "natural" = "keyword") {
  const { agencyId } = useAuth();
  const q = query.trim();
  return useQuery({
    queryKey: ["comms", "search", agencyId, q, mode],
    enabled: !!agencyId && q.length > 1,
    queryFn: async () => {
      const [index, messages] = await Promise.all([
        supabase
          .from("ttos_search_index")
          .select("id, entity_type, entity_id, title, subtitle, body, tags, updated_at")
          .eq("agency_id", agencyId!)
          .or(`title.ilike.%${q}%,subtitle.ilike.%${q}%,body.ilike.%${q}%`)
          .limit(40),
        supabase
          .from("ttos_messages")
          .select("id, thread_id, body, sender_id, created_at")
          .ilike("body", `%${q}%`)
          .order("created_at", { ascending: false })
          .limit(40),
      ]);
      let ai: string | null = null;
      if (mode !== "keyword") {
        try {
          const res = await cognitive<Record<string, unknown>>(agencyId!, "reason", {
            intent: mode === "semantic" ? "semantic_communication_search" : "natural_language_communication_search",
            query: q,
          });
          ai = typeof res?.summary === "string" ? res.summary : JSON.stringify(res ?? {}, null, 2);
        } catch (e) {
          ai = e instanceof Error ? e.message : "Cognitive search unavailable";
        }
      }
      return {
        records: (index.data ?? []) as Array<Record<string, unknown>>,
        messages: (messages.data ?? []) as Array<Record<string, unknown>>,
        ai,
      };
    },
  });
}

/* ------------------------------------------------------------------ */
/* WOIC assistant                                                      */
/* ------------------------------------------------------------------ */

export function useCommAssistant() {
  const { agencyId } = useAuth();
  return useMutation({
    mutationFn: async (vars: { task: AssistantTask; context: string; extra?: Record<string, unknown> }) => {
      if (!agencyId) throw new Error("Not authenticated");
      const res = await cognitive<Record<string, unknown>>(agencyId, vars.task.operation, {
        intent: vars.task.intent,
        surface: "communications_workspace",
        context: vars.context.slice(0, 12_000),
        ...vars.extra,
      });
      const text =
        typeof res === "string"
          ? res
          : typeof res?.summary === "string"
            ? res.summary
            : typeof res?.content === "string"
              ? res.content
              : JSON.stringify(res ?? {}, null, 2);
      return { task: vars.task, text };
    },
  });
}

/* ------------------------------------------------------------------ */
/* Analytics (derived — no duplicate metric store)                     */
/* ------------------------------------------------------------------ */

export function useCommAnalytics() {
  const threads = useCommThreads();
  const messages = useRecentMessages();
  const notifications = useCommNotifications();
  const tasks = useCommTasks("all");
  const events = useCommEvents(300);

  return useMemo(() => {
    const msgs = messages.data ?? [];
    const byDay = new Map<string, number>();
    for (const m of msgs) {
      const d = m.created_at.slice(0, 10);
      byDay.set(d, (byDay.get(d) ?? 0) + 1);
    }
    const volume = Array.from(byDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([day, count]) => ({ day: day.slice(5), count }));

    // Response time: gap between consecutive messages from different senders.
    const perThread = new Map<string, CommMessage[]>();
    for (const m of msgs) {
      const arr = perThread.get(m.thread_id) ?? [];
      arr.push(m);
      perThread.set(m.thread_id, arr);
    }
    const gaps: number[] = [];
    perThread.forEach((arr) => {
      const sorted = [...arr].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].sender_id !== sorted[i - 1].sender_id) {
          gaps.push((+new Date(sorted[i].created_at) - +new Date(sorted[i - 1].created_at)) / 60000);
        }
      }
    });
    const avgResponseMin = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 0;

    const notifs = notifications.data ?? [];
    const unread = notifs.filter((n) => !n.read_at).length;
    const openTasks = (tasks.data ?? []).filter((t) => t.status === "open").length;
    const aiEvents = (events.data ?? []).filter((e) => /ai|woic|cognitive/i.test(e.module)).length;
    const totalEvents = (events.data ?? []).length || 1;

    const health = Math.max(
      0,
      Math.min(100, Math.round(100 - unread * 2 - openTasks * 1.5 - (avgResponseMin > 240 ? 15 : 0))),
    );

    const byChannel = new Map<string, number>();
    for (const n of notifs) {
      const c = channelForModule(n.entity_type ?? "", "system");
      byChannel.set(c, (byChannel.get(c) ?? 0) + 1);
    }
    byChannel.set("internal", (byChannel.get("internal") ?? 0) + msgs.length);

    return {
      threads: (threads.data ?? []).length,
      messages: msgs.length,
      volume,
      avgResponseMin,
      unread,
      openTasks,
      aiUtilization: Math.round((aiEvents / totalEvents) * 100),
      health,
      channels: Array.from(byChannel.entries()).map(([channel, count]) => ({ channel, count })),
      isLoading: threads.isLoading || messages.isLoading,
    };
  }, [threads.data, threads.isLoading, messages.data, messages.isLoading, notifications.data, tasks.data, events.data]);
}

/* ------------------------------------------------------------------ */
/* Workspace-local state (layout, pins, snoozes, templates, meetings)  */
/* ------------------------------------------------------------------ */

export type CommMeeting = {
  id: string;
  title: string;
  starts_at: string;
  agenda: string;
  notes: string;
  transcript: string;
  recording_url: string;
  summary: string;
  decisions: string[];
};

export type CommCall = {
  id: string;
  contact: string;
  direction: "inbound" | "outbound";
  at: string;
  duration_min: number;
  notes: string;
};

export type CommTemplate = { id: string; name: string; channel: CommChannel; body: string };

export type CommsSettings = {
  density: "comfortable" | "compact";
  showEvents: boolean;
  desktopNotifications: boolean;
  digest: "off" | "daily" | "weekly";
  escalateAfterHours: number;
  mutedChannels: CommChannel[];
};

type WorkspaceState = {
  pinned: string[];
  snoozed: Record<string, string>;
  favorites: string[];
  templates: CommTemplate[];
  meetings: CommMeeting[];
  calls: CommCall[];
  settings: CommsSettings;
};

const KEY = "iwos.comms.workspace.v1";

const DEFAULT_STATE: WorkspaceState = {
  pinned: [],
  snoozed: {},
  favorites: [],
  templates: DEFAULT_TEMPLATES,
  meetings: [],
  calls: [],
  settings: {
    density: "comfortable",
    showEvents: true,
    desktopNotifications: false,
    digest: "daily",
    escalateAfterHours: 8,
    mutedChannels: [],
  },
};

function read(): WorkspaceState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<WorkspaceState>;
    return { ...DEFAULT_STATE, ...parsed, settings: { ...DEFAULT_STATE.settings, ...(parsed.settings ?? {}) } };
  } catch {
    return DEFAULT_STATE;
  }
}

export function useCommsWorkspace() {
  const [state, setState] = useState<WorkspaceState>(read);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setState(read()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((next: WorkspaceState) => {
    setState(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* quota */ }
  }, []);

  const update = useCallback(
    (patch: Partial<WorkspaceState>) => persist({ ...read(), ...patch }),
    [persist],
  );

  const togglePin = useCallback((id: string) => {
    const cur = read();
    const pinned = cur.pinned.includes(id) ? cur.pinned.filter((x) => x !== id) : [id, ...cur.pinned];
    persist({ ...cur, pinned });
  }, [persist]);

  const toggleFavorite = useCallback((id: string) => {
    const cur = read();
    const favorites = cur.favorites.includes(id) ? cur.favorites.filter((x) => x !== id) : [id, ...cur.favorites];
    persist({ ...cur, favorites });
  }, [persist]);

  const snooze = useCallback((id: string, hours: number) => {
    const cur = read();
    persist({ ...cur, snoozed: { ...cur.snoozed, [id]: new Date(Date.now() + hours * 3600_000).toISOString() } });
  }, [persist]);

  const unsnooze = useCallback((id: string) => {
    const cur = read();
    const snoozed = { ...cur.snoozed };
    delete snoozed[id];
    persist({ ...cur, snoozed });
  }, [persist]);

  const isSnoozed = useCallback(
    (id: string) => {
      const until = state.snoozed[id];
      return !!until && +new Date(until) > Date.now();
    },
    [state.snoozed],
  );

  const setSettings = useCallback((patch: Partial<CommsSettings>) => {
    const cur = read();
    persist({ ...cur, settings: { ...cur.settings, ...patch } });
  }, [persist]);

  const reset = useCallback(() => persist(DEFAULT_STATE), [persist]);

  return { state, update, togglePin, toggleFavorite, snooze, unsnooze, isSnoozed, setSettings, reset };
}
