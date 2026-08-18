// Bridges declared perception gaps (missing.list, PC-6.1B) to existing IWOS
// workflows: TTOS tasks, TTOS notifications and the event fabric.
//
// No perception happens here. Gap content is passed through verbatim from the
// Perception & Context API; this module only records the human follow-up the
// operator chose (resolve via task, or escalate).

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { emit } from "@/lib/ttos/events";
import { str } from "@/lib/perception/platform";

export const GAP_ENTITY_TYPE = "perception_gap";

export interface GapWorkflowRecord {
  id: string;
  title: string;
  status: string;
  priority: string;
  entity_id: string | null;
  created_at: string;
}

export function gapId(gap: Record<string, unknown>): string {
  return str(gap.id ?? gap.gap_id ?? gap.missing_item ?? gap.item, "");
}

export function gapTitle(gap: Record<string, unknown>): string {
  return str(gap.missing_item ?? gap.item ?? gap.id, "Declared information gap");
}

function gapSummary(gap: Record<string, unknown>): string {
  const lines = [
    `Missing item: ${gapTitle(gap)}`,
    gap.why_needed || gap.reason ? `Why needed: ${str(gap.why_needed ?? gap.reason)}` : null,
    gap.severity ? `Severity: ${str(gap.severity)}` : null,
    gap.recommended_resolution ? `Recommended resolution: ${str(gap.recommended_resolution)}` : null,
    gap.requesting_faculty ? `Requesting faculty: ${str(gap.requesting_faculty)}` : null,
    "",
    "Reported by WOIC Perception & Context (PC-6.1B). Values are verbatim from the API.",
  ].filter(Boolean);
  return lines.join("\n");
}

function severityPriority(gap: Record<string, unknown>): string {
  const s = str(gap.severity).toLowerCase();
  if (gap.blocking === true || s === "critical") return "critical";
  if (s === "high") return "high";
  if (s === "low" || s === "info") return "low";
  return "medium";
}

/** Follow-up work already linked to perception gaps. */
export function useGapWorkflows() {
  const { agencyId } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["perception-gap-workflows", agencyId],
    enabled: !!agencyId,
    queryFn: async (): Promise<GapWorkflowRecord[]> => {
      const { data, error } = await supabase
        .from("ttos_tasks")
        .select("id,title,status,priority,entity_id,created_at")
        .eq("agency_id", agencyId as string)
        .eq("entity_type", GAP_ENTITY_TYPE)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return (data ?? []) as GapWorkflowRecord[];
    },
  });

  const byGap = useMemo(() => {
    const map = new Map<string, GapWorkflowRecord[]>();
    (query.data ?? []).forEach((row) => {
      const key = row.entity_id ?? "";
      map.set(key, [...(map.get(key) ?? []), row]);
    });
    return map;
  }, [query.data]);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["perception-gap-workflows", agencyId] });
  }, [queryClient, agencyId]);

  const createTask = useMutation({
    mutationFn: async ({ gap, note, dueAt }: { gap: Record<string, unknown>; note?: string; dueAt?: string | null }) => {
      if (!agencyId) throw new Error("No agency context.");
      const id = gapId(gap);
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("ttos_tasks")
        .insert({
          agency_id: agencyId,
          title: `Resolve missing context: ${gapTitle(gap)}`,
          description: [gapSummary(gap), note ? `\nOperator note: ${note}` : ""].join(""),
          priority: severityPriority(gap),
          entity_type: GAP_ENTITY_TYPE,
          entity_id: id || null,
          due_at: dueAt || null,
          created_by: userRes?.user?.id ?? null,
          metadata: { source: "perception.missing", contract: "PC-6.1B", gap },
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      await emit({
        agencyId,
        module: "perception",
        name: "perception.gap.task_created",
        entityType: GAP_ENTITY_TYPE,
        entityId: id || null,
        metadata: { task_id: (data as { id: string }).id, gap_item: gapTitle(gap), severity: str(gap.severity) },
      });
      return data as { id: string };
    },
    onSuccess: invalidate,
  });

  const escalate = useMutation({
    mutationFn: async ({ gap, note }: { gap: Record<string, unknown>; note?: string }) => {
      if (!agencyId) throw new Error("No agency context.");
      const id = gapId(gap);
      const { data: userRes } = await supabase.auth.getUser();
      const recipient = userRes?.user?.id;
      if (!recipient) throw new Error("You must be signed in to escalate.");
      const { error } = await supabase.from("ttos_notifications").insert({
        agency_id: agencyId,
        recipient_id: recipient,
        level: severityPriority(gap) === "critical" ? "critical" : "warning",
        title: `Escalated missing context: ${gapTitle(gap)}`,
        body: [gapSummary(gap), note ? `\nEscalation note: ${note}` : ""].join(""),
        entity_type: GAP_ENTITY_TYPE,
        entity_id: id || null,
        metadata: { source: "perception.missing", contract: "PC-6.1B", gap },
      });
      if (error) throw new Error(error.message);
      await emit({
        agencyId,
        module: "perception",
        name: "perception.gap.escalated",
        entityType: GAP_ENTITY_TYPE,
        entityId: id || null,
        metadata: { gap_item: gapTitle(gap), severity: str(gap.severity), note: note ?? null },
      });
    },
    onSuccess: invalidate,
  });

  const completeTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("ttos_tasks")
        .update({ status: "done", completed_at: new Date().toISOString() })
        .eq("id", taskId);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  return { workflows: query.data ?? [], byGap, isLoading: query.isLoading, createTask, escalate, completeTask };
}
