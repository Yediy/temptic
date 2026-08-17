import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TimelineCategory =
  | "onboarding"
  | "verification"
  | "assignment"
  | "training"
  | "credential"
  | "compliance"
  | "badge"
  | "system";

export type AggregatedEvent = {
  id: string;
  category: TimelineCategory;
  date: string;
  title: string;
  description?: string | null;
  status?: string | null;
  source: string;
  metadata?: Record<string, unknown> | null;
};

export const TIMELINE_CATEGORIES: { key: TimelineCategory; label: string }[] = [
  { key: "onboarding", label: "Onboarding" },
  { key: "verification", label: "Verifications" },
  { key: "assignment", label: "Assignments" },
  { key: "training", label: "Training" },
  { key: "credential", label: "Credentials" },
  { key: "compliance", label: "Compliance" },
  { key: "badge", label: "Badges" },
  { key: "system", label: "System" },
];

const sb = supabase as any;

function push(list: AggregatedEvent[], e: AggregatedEvent | null) {
  if (e && e.date) list.push(e);
}

/**
 * Aggregates every passport-relevant milestone into a single chronological stream.
 * Read-only: each source table is queried under existing RLS.
 */
export function usePassportTimelineAggregate(passportId?: string, workerId?: string) {
  return useQuery({
    queryKey: ["passport-timeline-aggregate", passportId, workerId],
    enabled: !!passportId && !!workerId,
    queryFn: async (): Promise<AggregatedEvent[]> => {
      const [
        timeline,
        onboarding,
        idVerifications,
        passportVerifications,
        assignments,
        training,
        certificates,
        credentials,
        compliance,
        badges,
      ] = await Promise.all([
        sb.from("passport_timeline").select("*").eq("passport_id", passportId).order("event_date", { ascending: false }).limit(300),
        sb.from("onboarding_sessions").select("*").eq("worker_id", workerId).order("started_at", { ascending: false }),
        sb.from("identity_verifications").select("*").eq("passport_id", passportId),
        sb.from("passport_verifications").select("*").eq("passport_id", passportId),
        sb.from("assignments").select("*").eq("worker_id", workerId).order("starts_on", { ascending: false }),
        sb.from("training_enrollments").select("*, training_courses(title)").eq("worker_id", workerId),
        sb.from("training_certificates").select("*").eq("worker_id", workerId),
        sb.from("worker_credentials").select("*").eq("worker_id", workerId),
        sb.from("passport_compliance").select("*").eq("passport_id", passportId),
        sb.from("passport_badges").select("*").eq("passport_id", passportId),
      ]);

      const out: AggregatedEvent[] = [];

      for (const t of timeline.data ?? []) {
        push(out, {
          id: `tl-${t.id}`,
          category: "system",
          date: t.event_date,
          title: t.title,
          description: t.description,
          status: t.event_type,
          source: "passport_timeline",
          metadata: t.metadata,
        });
      }

      for (const s of onboarding.data ?? []) {
        push(out, {
          id: `ob-start-${s.id}`,
          category: "onboarding",
          date: s.started_at ?? s.created_at,
          title: "Onboarding started",
          description: s.current_step ? `Current step: ${s.current_step}` : null,
          status: `${s.progress_pct ?? 0}% complete`,
          source: "onboarding_sessions",
        });
        if (s.completed_at) {
          push(out, {
            id: `ob-done-${s.id}`,
            category: "onboarding",
            date: s.completed_at,
            title: "Onboarding completed",
            status: s.status,
            source: "onboarding_sessions",
          });
        }
      }

      for (const v of idVerifications.data ?? []) {
        push(out, {
          id: `idv-${v.id}`,
          category: "verification",
          date: v.verified_at ?? v.created_at,
          title: `Identity verification · ${v.method ?? "unknown method"}`,
          description: v.verifier ? `Verified by ${v.verifier}` : null,
          status: v.status,
          source: "identity_verifications",
        });
      }

      for (const v of passportVerifications.data ?? []) {
        push(out, {
          id: `pv-${v.id}`,
          category: "verification",
          date: v.verified_at ?? v.created_at,
          title: `Verification · ${v.verification_type}`,
          description: v.verifier ? `Verified by ${v.verifier}` : null,
          status: v.status,
          source: "passport_verifications",
        });
      }

      for (const a of assignments.data ?? []) {
        push(out, {
          id: `as-start-${a.id}`,
          category: "assignment",
          date: a.starts_on ?? a.created_at,
          title: "Assignment started",
          description: a.site_id ? `Site ${String(a.site_id).slice(0, 8)}` : null,
          status: a.status,
          source: "assignments",
        });
        if (a.ends_on) {
          push(out, {
            id: `as-end-${a.id}`,
            category: "assignment",
            date: a.ends_on,
            title: "Assignment ended",
            status: a.status,
            source: "assignments",
          });
        }
      }

      for (const t of training.data ?? []) {
        const title = t.training_courses?.title ?? "Training course";
        push(out, {
          id: `tr-start-${t.id}`,
          category: "training",
          date: t.started_at ?? t.created_at,
          title: `Enrolled · ${title}`,
          status: t.status,
          source: "training_enrollments",
        });
        if (t.completed_at) {
          push(out, {
            id: `tr-done-${t.id}`,
            category: "training",
            date: t.completed_at,
            title: `Completed · ${title}`,
            status: `${t.progress_pct ?? 100}%`,
            source: "training_enrollments",
          });
        }
      }

      for (const c of certificates.data ?? []) {
        push(out, {
          id: `cert-${c.id}`,
          category: "training",
          date: c.issued_at,
          title: "Training certificate issued",
          description: c.certificate_number ? `No. ${c.certificate_number}` : null,
          status: c.expires_at ? `Expires ${new Date(c.expires_at).toLocaleDateString()}` : "No expiry",
          source: "training_certificates",
        });
      }

      for (const c of credentials.data ?? []) {
        push(out, {
          id: `cr-${c.id}`,
          category: "credential",
          date: c.issued_on ?? c.created_at,
          title: `Credential · ${c.name}`,
          description: c.issuer ? `Issued by ${c.issuer}` : null,
          status: c.status,
          source: "worker_credentials",
        });
        if (c.expires_on) {
          push(out, {
            id: `cr-exp-${c.id}`,
            category: "credential",
            date: c.expires_on,
            title: `Credential expiry · ${c.name}`,
            status: new Date(c.expires_on) < new Date() ? "expired" : "upcoming",
            source: "worker_credentials",
          });
        }
      }

      for (const c of compliance.data ?? []) {
        push(out, {
          id: `cp-${c.id}`,
          category: "compliance",
          date: c.completed_at ?? c.created_at,
          title: `Compliance · ${c.label}`,
          description: c.requirement_type,
          status: c.status,
          source: "passport_compliance",
        });
        if (c.expires_at) {
          push(out, {
            id: `cp-exp-${c.id}`,
            category: "compliance",
            date: c.expires_at,
            title: `Compliance expiry · ${c.label}`,
            status: new Date(c.expires_at) < new Date() ? "expired" : "upcoming",
            source: "passport_compliance",
          });
        }
      }

      for (const b of badges.data ?? []) {
        push(out, {
          id: `bd-${b.id}`,
          category: "badge",
          date: b.awarded_at ?? b.created_at,
          title: `Badge earned · ${b.name}`,
          description: b.description,
          status: b.tier,
          source: "passport_badges",
        });
      }

      return out.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
  });
}
