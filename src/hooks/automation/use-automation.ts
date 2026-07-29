// Automation Studio hooks — thin wrappers over TTOS + automation_* tables.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export type AutomationRule = {
  id: string;
  agency_id: string;
  name: string;
  description: string | null;
  trigger_event: string;
  conditions: Array<Record<string, unknown>>;
  actions: Array<Record<string, unknown>>;
  enabled: boolean;
  priority: number;
  version: number;
  template_id: string | null;
  require_approval: boolean;
  approved_by: string | null;
  approved_at: string | null;
  tags: string[];
  last_run_at: string | null;
  success_count: number;
  failure_count: number;
  created_at: string;
  updated_at: string;
};

export type AutomationTemplate = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  trigger_event: string;
  conditions: Array<Record<string, unknown>>;
  actions: Array<Record<string, unknown>>;
  tags: string[];
  icon: string | null;
  is_builtin: boolean;
};

export type AutomationAgent = {
  id: string;
  agency_id: string;
  name: string;
  role: string;
  description: string | null;
  model: string;
  system_prompt: string;
  tools: Array<Record<string, unknown>>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type AgentRun = {
  id: string;
  agency_id: string;
  agent_id: string;
  automation_id: string | null;
  event_id: string | null;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  status: string;
  error: string | null;
  tokens_used: number | null;
  duration_ms: number | null;
  created_at: string;
};

export type AutomationRun = {
  id: string;
  automation_id: string;
  event_id: string;
  agency_id: string;
  status: string;
  attempts: number;
  error: string | null;
  output: Array<Record<string, unknown>>;
  ran_at: string;
  duration_ms: number | null;
  next_retry_at: string | null;
  triggered_by: string | null;
};

export type DeadLetter = {
  id: string;
  agency_id: string;
  source_kind: string;
  source_id: string | null;
  automation_id: string | null;
  event_id: string | null;
  payload: Record<string, unknown>;
  error: string | null;
  attempts: number;
  resolved_at: string | null;
  created_at: string;
};

// ---------- Rules ----------
export function useAutomationRules() {
  const { agencyId } = useAuth();
  return useQuery({
    queryKey: ["automation-rules", agencyId],
    enabled: !!agencyId,
    queryFn: async (): Promise<AutomationRule[]> => {
      const { data, error } = await sb.from("ttos_automations").select("*").eq("agency_id", agencyId).order("priority");
      if (error) throw error;
      return (data ?? []) as AutomationRule[];
    },
  });
}

export function useSaveRule() {
  const qc = useQueryClient();
  const { agencyId, user } = useAuth();
  return useMutation({
    mutationFn: async (rule: Partial<AutomationRule> & { name: string; trigger_event: string; actions: unknown[] }) => {
      const payload = {
        agency_id: agencyId,
        name: rule.name,
        description: rule.description ?? null,
        trigger_event: rule.trigger_event,
        conditions: rule.conditions ?? [],
        actions: rule.actions,
        enabled: rule.enabled ?? true,
        priority: rule.priority ?? 100,
        require_approval: rule.require_approval ?? false,
        tags: rule.tags ?? [],
        template_id: rule.template_id ?? null,
        created_by: user?.id ?? null,
      };
      if (rule.id) {
        const { error } = await sb.from("ttos_automations").update(payload).eq("id", rule.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("ttos_automations").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Automation saved" });
      qc.invalidateQueries({ queryKey: ["automation-rules"] });
    },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });
}

export function useToggleRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await sb.from("ttos_automations").update({ enabled }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-rules"] }),
  });
}

export function useDeleteRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("ttos_automations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Automation deleted" });
      qc.invalidateQueries({ queryKey: ["automation-rules"] });
    },
  });
}

// ---------- Templates ----------
export function useAutomationTemplates() {
  return useQuery({
    queryKey: ["automation-templates"],
    queryFn: async (): Promise<AutomationTemplate[]> => {
      const { data, error } = await sb.from("automation_templates").select("*").order("category").order("name");
      if (error) throw error;
      return (data ?? []) as AutomationTemplate[];
    },
  });
}

export function useInstallTemplate() {
  const qc = useQueryClient();
  const { agencyId, user } = useAuth();
  return useMutation({
    mutationFn: async (tpl: AutomationTemplate) => {
      const { error } = await sb.from("ttos_automations").insert({
        agency_id: agencyId,
        name: tpl.name,
        description: tpl.description,
        trigger_event: tpl.trigger_event,
        conditions: tpl.conditions,
        actions: tpl.actions,
        enabled: false,
        priority: 100,
        template_id: tpl.id,
        tags: tpl.tags,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Template installed", description: "Enable it in the dashboard when ready." });
      qc.invalidateQueries({ queryKey: ["automation-rules"] });
    },
    onError: (e: Error) => toast({ title: "Install failed", description: e.message, variant: "destructive" }),
  });
}

// ---------- Runs (live monitor) ----------
export function useAutomationRuns(limit = 50) {
  const { agencyId } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["automation-runs", agencyId, limit],
    enabled: !!agencyId,
    queryFn: async (): Promise<AutomationRun[]> => {
      const { data, error } = await sb
        .from("ttos_automation_runs")
        .select("*")
        .eq("agency_id", agencyId)
        .order("ran_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as AutomationRun[];
    },
  });
  useEffect(() => {
    if (!agencyId) return;
    const ch = supabase
      .channel(`auto-runs-${agencyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ttos_automation_runs", filter: `agency_id=eq.${agencyId}` }, () => {
        qc.invalidateQueries({ queryKey: ["automation-runs", agencyId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [agencyId, qc]);
  return q;
}

export function useJobsQueue() {
  const { agencyId } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["automation-jobs", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await sb.from("ttos_jobs").select("*").eq("agency_id", agencyId).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
  useEffect(() => {
    if (!agencyId) return;
    const ch = supabase
      .channel(`auto-jobs-${agencyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ttos_jobs", filter: `agency_id=eq.${agencyId}` }, () => {
        qc.invalidateQueries({ queryKey: ["automation-jobs", agencyId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [agencyId, qc]);
  return q;
}

// ---------- Agents ----------
export function useAutomationAgents() {
  const { agencyId } = useAuth();
  return useQuery({
    queryKey: ["automation-agents", agencyId],
    enabled: !!agencyId,
    queryFn: async (): Promise<AutomationAgent[]> => {
      const { data, error } = await sb.from("automation_agents").select("*").eq("agency_id", agencyId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AutomationAgent[];
    },
  });
}

export function useSaveAgent() {
  const qc = useQueryClient();
  const { agencyId, user } = useAuth();
  return useMutation({
    mutationFn: async (agent: Partial<AutomationAgent> & { name: string; role: string; system_prompt: string }) => {
      const payload = {
        agency_id: agencyId,
        name: agent.name,
        role: agent.role,
        description: agent.description ?? null,
        model: agent.model ?? "google/gemini-2.5-flash",
        system_prompt: agent.system_prompt,
        tools: agent.tools ?? [],
        enabled: agent.enabled ?? true,
        created_by: user?.id ?? null,
      };
      if (agent.id) {
        const { error } = await sb.from("automation_agents").update(payload).eq("id", agent.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("automation_agents").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Agent saved" });
      qc.invalidateQueries({ queryKey: ["automation-agents"] });
    },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });
}

export function useAgentRuns(limit = 50) {
  const { agencyId } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["agent-runs", agencyId, limit],
    enabled: !!agencyId,
    queryFn: async (): Promise<AgentRun[]> => {
      const { data, error } = await sb.from("automation_agent_runs").select("*").eq("agency_id", agencyId).order("created_at", { ascending: false }).limit(limit);
      if (error) throw error;
      return (data ?? []) as AgentRun[];
    },
  });
  useEffect(() => {
    if (!agencyId) return;
    const ch = supabase
      .channel(`agent-runs-${agencyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "automation_agent_runs", filter: `agency_id=eq.${agencyId}` }, () => {
        qc.invalidateQueries({ queryKey: ["agent-runs", agencyId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [agencyId, qc]);
  return q;
}

// ---------- Dead letter ----------
export function useDeadLetter() {
  const { agencyId } = useAuth();
  return useQuery({
    queryKey: ["automation-dead-letter", agencyId],
    enabled: !!agencyId,
    queryFn: async (): Promise<DeadLetter[]> => {
      const { data, error } = await sb.from("automation_dead_letter").select("*").eq("agency_id", agencyId).is("resolved_at", null).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DeadLetter[];
    },
  });
}

export function useResolveDeadLetter() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("automation_dead_letter").update({ resolved_at: new Date().toISOString(), resolved_by: user?.id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Marked resolved" });
      qc.invalidateQueries({ queryKey: ["automation-dead-letter"] });
    },
  });
}

// ---------- AI: suggest / explain ----------
export function useSuggestAutomation() {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  async function run(prompt: string) {
    setLoading(true);
    setSuggestion(null);
    try {
      const { data, error } = await supabase.functions.invoke("automation-suggest", { body: { prompt } });
      if (error) throw error;
      setSuggestion((data as { text?: string })?.text ?? "No suggestion returned.");
    } catch (e) {
      toast({ title: "Suggestion failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }
  return { run, loading, suggestion };
}

// ---------- Analytics ----------
export function useAutomationAnalytics() {
  const runs = useAutomationRuns(500);
  const rules = useAutomationRules();
  const dl = useDeadLetter();
  const total = runs.data?.length ?? 0;
  const succeeded = runs.data?.filter((r) => r.status === "succeeded").length ?? 0;
  const failed = runs.data?.filter((r) => r.status === "failed").length ?? 0;
  const avgMs = (() => {
    const arr = runs.data?.filter((r) => r.duration_ms != null).map((r) => r.duration_ms!) ?? [];
    if (arr.length === 0) return 0;
    return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  })();
  return {
    loading: runs.isLoading || rules.isLoading,
    totals: {
      runs: total,
      succeeded,
      failed,
      successRate: total ? Math.round((succeeded / total) * 100) : 0,
      avgMs,
      activeRules: rules.data?.filter((r) => r.enabled).length ?? 0,
      totalRules: rules.data?.length ?? 0,
      deadLetter: dl.data?.length ?? 0,
    },
  };
}
