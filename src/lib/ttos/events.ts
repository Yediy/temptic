// TTOS event bus — client-side emitter.
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

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
    .from("ttos_events" as Any)
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
    } as Any)
    .select("id")
    .single();
  if (error) {
    console.warn("[ttos] emit failed:", error.message);
    return null;
  }
  supabase.functions.invoke("ttos-dispatch", { body: { event_id: (data as unknown as { id: string }).id } }).catch(() => {});
  return data as unknown as { id: string };
}

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
