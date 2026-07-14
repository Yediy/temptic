import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type WorkerRow = Tables<"workers">;
export type WorkerProfile = Tables<"worker_profiles">;
export type WorkerCredential = Tables<"worker_credentials">;
export type EmploymentRow = Tables<"employment_history">;
export type WorkerReference = Tables<"worker_references">;
export type WorkerDocument = Tables<"worker_documents">;
export type EmergencyContact = Tables<"emergency_contacts">;
export type ResumeParseRun = Tables<"resume_parse_runs">;

/** Weighted section scores that add up to 100. */
export const PASSPORT_WEIGHTS = {
  identity: 15,
  work_history: 15,
  skills: 10,
  credentials: 15,
  availability: 10,
  documents: 10,
  training: 10,
  payroll_readiness: 10,
  screening_readiness: 5,
} as const;

export interface PassportSectionStatus {
  key: keyof typeof PASSPORT_WEIGHTS;
  label: string;
  weight: number;
  complete: boolean;
  missing: string[];
}

export interface PassportBundle {
  worker: WorkerRow;
  profile: WorkerProfile | null;
  credentials: WorkerCredential[];
  employment: EmploymentRow[];
  references: WorkerReference[];
  documents: WorkerDocument[];
  emergency: EmergencyContact[];
}

export function computePassportSections(b: PassportBundle): PassportSectionStatus[] {
  const p = b.profile;
  const missing = (cond: boolean, label: string) => (cond ? [] : [label]);

  const identityMissing = [
    ...missing(!!b.worker.first_name, "First name"),
    ...missing(!!b.worker.last_name, "Last name"),
    ...missing(!!b.worker.phone, "Phone"),
    ...missing(!!p?.general_location, "General location"),
    ...missing(!!b.emergency[0], "Emergency contact"),
  ];

  const workMissing = missing(b.employment.length > 0, "At least one employment entry");
  const skillsMissing = missing(!!(p && (p.trade_specialties?.length || p.years_experience)), "Trades or years of experience");
  const credsMissing = missing(b.credentials.length > 0, "At least one credential");
  const availabilityMissing = [
    ...missing(!!(p?.shift_preferences?.length), "Shift preferences"),
    ...missing(!!(p?.travel_radius_miles), "Travel radius"),
    ...missing(!!(p?.transportation_status), "Transportation status"),
  ];
  const documentsMissing = missing(b.documents.length > 0, "Résumé or ID document");
  const trainingMissing = ["Training records (Phase 2)"];
  const payrollMissing = missing(!!b.worker.classification, "Worker classification on file");
  const screeningMissing = ["Screening consent (Phase 3)"];

  return [
    { key: "identity", label: "Identity", weight: PASSPORT_WEIGHTS.identity, complete: identityMissing.length === 0, missing: identityMissing },
    { key: "work_history", label: "Work history", weight: PASSPORT_WEIGHTS.work_history, complete: workMissing.length === 0, missing: workMissing },
    { key: "skills", label: "Skills", weight: PASSPORT_WEIGHTS.skills, complete: skillsMissing.length === 0, missing: skillsMissing },
    { key: "credentials", label: "Credentials", weight: PASSPORT_WEIGHTS.credentials, complete: credsMissing.length === 0, missing: credsMissing },
    { key: "availability", label: "Availability", weight: PASSPORT_WEIGHTS.availability, complete: availabilityMissing.length === 0, missing: availabilityMissing },
    { key: "documents", label: "Documents", weight: PASSPORT_WEIGHTS.documents, complete: documentsMissing.length === 0, missing: documentsMissing },
    { key: "training", label: "Training", weight: PASSPORT_WEIGHTS.training, complete: false, missing: trainingMissing },
    { key: "payroll_readiness", label: "Payroll readiness", weight: PASSPORT_WEIGHTS.payroll_readiness, complete: payrollMissing.length === 0, missing: payrollMissing },
    { key: "screening_readiness", label: "Screening readiness", weight: PASSPORT_WEIGHTS.screening_readiness, complete: false, missing: screeningMissing },
  ];
}

export function computeCompletionScore(sections: PassportSectionStatus[]): number {
  return sections.reduce((acc, s) => acc + (s.complete ? s.weight : 0), 0);
}

export function usePassport(workerId?: string) {
  return useQuery({
    queryKey: ["passport", workerId],
    enabled: !!workerId,
    queryFn: async (): Promise<PassportBundle> => {
      const [wr, pr, cr, er, rr, dr, ec] = await Promise.all([
        supabase.from("workers").select("*").eq("id", workerId!).single(),
        supabase.from("worker_profiles").select("*").eq("worker_id", workerId!).maybeSingle(),
        supabase.from("worker_credentials").select("*").eq("worker_id", workerId!).order("expires_on", { ascending: true }),
        supabase.from("employment_history").select("*").eq("worker_id", workerId!).order("started_on", { ascending: false }),
        supabase.from("worker_references").select("*").eq("worker_id", workerId!),
        supabase.from("worker_documents").select("*").eq("worker_id", workerId!).order("created_at", { ascending: false }),
        supabase.from("emergency_contacts").select("*").eq("worker_id", workerId!),
      ]);
      if (wr.error) throw wr.error;
      return {
        worker: wr.data as WorkerRow,
        profile: (pr.data ?? null) as WorkerProfile | null,
        credentials: (cr.data ?? []) as WorkerCredential[],
        employment: (er.data ?? []) as EmploymentRow[],
        references: (rr.data ?? []) as WorkerReference[],
        documents: (dr.data ?? []) as WorkerDocument[],
        emergency: (ec.data ?? []) as EmergencyContact[],
      };
    },
  });
}

export function useUpsertWorkerProfile(workerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<WorkerProfile>) => {
      // Compute score client-side and persist it so the trigger can emit events.
      const { data: current } = await supabase.from("worker_profiles").select("*").eq("worker_id", workerId).maybeSingle();
      const merged = { ...(current || {}), ...patch, worker_id: workerId } as WorkerProfile;
      const { error } = await supabase.from("worker_profiles").upsert(merged, { onConflict: "worker_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["passport", workerId] }),
  });
}

export function useUpdateCompletionScore(workerId: string) {
  return useMutation({
    mutationFn: async (score: number) => {
      const { error } = await supabase
        .from("worker_profiles")
        .upsert({ worker_id: workerId, completion_score: score, completion_updated_at: new Date().toISOString() }, { onConflict: "worker_id" });
      if (error) throw error;
    },
  });
}

export function useAddCredential(workerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; issuer?: string; issued_on?: string | null; expires_on?: string | null; notes?: string | null }) => {
      const { error } = await supabase.from("worker_credentials").insert({ worker_id: workerId, ...payload });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["passport", workerId] }),
  });
}

export function useAddEmployment(workerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<EmploymentRow>) => {
      const { error } = await supabase.from("employment_history").insert({ ...payload, worker_id: workerId, employer: payload.employer || "" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["passport", workerId] }),
  });
}

export function useSetEmergencyContact(workerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; phone: string; relationship?: string; email?: string }) => {
      const { error } = await supabase.from("emergency_contacts").insert({ worker_id: workerId, ...payload });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["passport", workerId] }),
  });
}

export function useResumeParseRuns(workerId?: string) {
  return useQuery({
    queryKey: ["resume-parse-runs", workerId],
    enabled: !!workerId,
    queryFn: async () => {
      const { data, error } = await supabase.from("resume_parse_runs").select("*").eq("worker_id", workerId!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ResumeParseRun[];
    },
  });
}

export function useStartResumeParse(workerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (documentId?: string) => {
      const { data, error } = await supabase.functions.invoke("parse-resume", {
        body: { worker_id: workerId, document_id: documentId ?? null },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resume-parse-runs", workerId] });
      qc.invalidateQueries({ queryKey: ["passport", workerId] });
    },
  });
}

export function useApplyResumeSuggestions(workerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { runId: string; accepted: Record<string, unknown> }) => {
      // Apply accepted suggestions to worker_profiles + employment_history + skills as appropriate.
      const patch: Partial<WorkerProfile> = {};
      if (typeof args.accepted.bio === "string") patch.bio = args.accepted.bio as string;
      if (typeof args.accepted.years_experience === "number") patch.years_experience = args.accepted.years_experience as number;
      if (Array.isArray(args.accepted.trade_specialties)) patch.trade_specialties = args.accepted.trade_specialties as string[];
      if (Array.isArray(args.accepted.languages)) patch.languages = args.accepted.languages as string[];
      if (Object.keys(patch).length > 0) {
        const { data: current } = await supabase.from("worker_profiles").select("*").eq("worker_id", workerId).maybeSingle();
        const merged = { ...(current || {}), ...patch, worker_id: workerId } as WorkerProfile;
        const { error } = await supabase.from("worker_profiles").upsert(merged, { onConflict: "worker_id" });
        if (error) throw error;
      }
      if (Array.isArray(args.accepted.employment_history)) {
        const rows = (args.accepted.employment_history as Array<Record<string, unknown>>).map((r) => ({
          worker_id: workerId,
          employer: String(r.employer || ""),
          role: r.role ? String(r.role) : null,
          started_on: r.started_on ? String(r.started_on) : null,
          ended_on: r.ended_on ? String(r.ended_on) : null,
          description: r.description ? String(r.description) : null,
        }));
        if (rows.length) {
          const { error } = await supabase.from("employment_history").insert(rows);
          if (error) throw error;
        }
      }
      await supabase
        .from("resume_parse_runs")
        .update({ status: "applied", applied_fields: args.accepted })
        .eq("id", args.runId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["passport", workerId] });
      qc.invalidateQueries({ queryKey: ["resume-parse-runs", workerId] });
    },
  });
}
