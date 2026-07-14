// TTOS event bus — client-side emitter.
// Every meaningful action in Temp Tic should call `emit()`. Rows land in
// `ttos_events`; the `ttos-dispatch` edge function fans them out to
// subscribers (automations, search reindex, audit).
import { supabase } from "@/integrations/supabase/client";

export type TtosEventInput = {
  agencyId: string;
  module: string;
  name: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  relatedObjects?: Array<Record<string, unknown>>;
  correlationId?: string | null;
};

export async function emit(evt: TtosEventInput): Promise<{ id: string } | null> {
  const { data: userRes } = await supabase.auth.getUser();
  const actorId = userRes?.user?.id ?? null;
  const { data, error } = await supabase
    .from("ttos_events")
    .insert({
      agency_id: evt.agencyId,
      module: evt.module,
      name: evt.name,
      actor_id: actorId,
      entity_type: evt.entityType ?? null,
      entity_id: evt.entityId ?? null,
      metadata: evt.metadata ?? {},
      related_objects: evt.relatedObjects ?? [],
      correlation_id: evt.correlationId ?? null,
    })
    .select("id")
    .single();
  if (error) {
    console.warn("[ttos] emit failed:", error.message);
    return null;
  }
  // Fire-and-forget dispatch (don't block UI)
  supabase.functions.invoke("ttos-dispatch", { body: { event_id: data.id } }).catch(() => {});
  return data;
}

// Canonical event names — extend as modules grow.
export const TtosEvent = {
  WorkerCreated: "worker.created",
  WorkerUpdated: "worker.updated",
  JobCreated: "job.created",
  JobClosed: "job.closed",
  TicketSent: "ticket.sent",
  TicketSigned: "ticket.signed",
  TicketRejected: "ticket.rejected",
  TicketApproved: "ticket.approved",
  DocumentSigned: "document.signed",
  TrainingCompleted: "training.completed",
  CredentialExpiring: "credential.expiring",
  InviteAccepted: "invite.accepted",
  AiRecommendationGenerated: "ai.recommendation.generated",
} as const;
