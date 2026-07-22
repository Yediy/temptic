import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type {
  WorkforcePassport,
  PassportPermission,
  IdentityVerification,
  PassportCompliance,
  PassportReputation,
  PassportPortfolio,
  PassportTimeline,
  PassportOpportunity,
  CareerRecommendation,
  PassportAccessLog,
  PassportSharingLink,
  PassportVerification,
  PassportBadge,
} from "@/lib/passport/types";

// Tables added post-types-regen — cast the client until types refresh.
const sb = supabase as any;

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function useSharingLinks(passportId?: string) {
  return useQuery({
    queryKey: ["passport-sharing", passportId],
    enabled: !!passportId,
    queryFn: async () => {
      const { data, error } = await sb.from("passport_sharing")
        .select("*").eq("passport_id", passportId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as PassportSharingLink[];
    },
  });
}

export function useCreateSharingLink(passportId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { label?: string; scopes: string[]; expires_at?: string | null }) => {
      const token = randomToken();
      const token_hash = await sha256Hex(token);
      const { error } = await sb.from("passport_sharing").insert({
        passport_id: passportId,
        token_hash,
        label: input.label ?? null,
        scopes: input.scopes,
        expires_at: input.expires_at ?? null,
      });
      if (error) throw error;
      return { token };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["passport-sharing", passportId] }),
  });
}

export function useRevokeSharingLink(passportId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("passport_sharing")
        .update({ revoked_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["passport-sharing", passportId] }),
  });
}

export function useVerifications(passportId?: string) {
  return useQuery({
    queryKey: ["passport-verifications-granular", passportId],
    enabled: !!passportId,
    queryFn: async () => {
      const { data, error } = await sb.from("passport_verifications")
        .select("*").eq("passport_id", passportId).order("verification_type");
      if (error) throw error;
      return data as PassportVerification[];
    },
  });
}

export function useBadges(passportId?: string) {
  return useQuery({
    queryKey: ["passport-badges", passportId],
    enabled: !!passportId,
    queryFn: async () => {
      const { data, error } = await sb.from("passport_badges")
        .select("*").eq("passport_id", passportId).order("awarded_at", { ascending: false });
      if (error) throw error;
      return data as PassportBadge[];
    },
  });
}

// legacy import bag; keep at top-level so downstream signatures unaffected
import type {

/** Resolve the current worker's passport id (owner view). */
export function useMyPassport() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["passport", "me", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: worker, error: we } = await supabase
        .from("workers").select("id").eq("user_id", user!.id).maybeSingle();
      if (we) throw we;
      if (!worker) return null;
      const { data, error } = await supabase
        .from("workforce_passports").select("*").eq("worker_id", worker.id).maybeSingle();
      if (error) throw error;
      return data as WorkforcePassport | null;
    },
  });
}

export function usePassport(passportId?: string) {
  return useQuery({
    queryKey: ["passport", passportId],
    enabled: !!passportId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workforce_passports").select("*").eq("id", passportId!).single();
      if (error) throw error;
      return data as WorkforcePassport;
    },
  });
}

export function useUpdatePassport(passportId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<WorkforcePassport>) => {
      const { error } = await supabase
        .from("workforce_passports").update(patch).eq("id", passportId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["passport", passportId] }),
  });
}

/** Bundle worker-scoped records for the passport. */
export function usePassportBundle(passportId?: string, workerId?: string) {
  return useQuery({
    queryKey: ["passport-bundle", passportId, workerId],
    enabled: !!passportId && !!workerId,
    queryFn: async () => {
      const [
        skills, credentials, docs, training, employment,
        compliance, reputation, portfolio, timeline, opps, recs, verifications, perms
      ] = await Promise.all([
        supabase.from("worker_skills").select("*").eq("worker_id", workerId!),
        supabase.from("worker_credentials").select("*").eq("worker_id", workerId!),
        supabase.from("worker_documents").select("*").eq("worker_id", workerId!),
        supabase.from("training_enrollments").select("*, training_courses(title)").eq("worker_id", workerId!),
        supabase.from("employment_history").select("*").eq("worker_id", workerId!).order("started_on", { ascending: false }),
        supabase.from("passport_compliance").select("*").eq("passport_id", passportId!),
        supabase.from("passport_reputation").select("*").eq("passport_id", passportId!),
        supabase.from("passport_portfolios").select("*").eq("passport_id", passportId!).order("order_index"),
        supabase.from("passport_timeline").select("*").eq("passport_id", passportId!).order("event_date", { ascending: false }).limit(100),
        supabase.from("passport_opportunities").select("*").eq("passport_id", passportId!).order("score", { ascending: false }),
        supabase.from("career_recommendations").select("*").eq("passport_id", passportId!).order("priority", { ascending: false }),
        supabase.from("identity_verifications").select("*").eq("passport_id", passportId!),
        supabase.from("passport_permissions").select("*").eq("passport_id", passportId!),
      ]);
      return {
        skills: skills.data ?? [],
        credentials: credentials.data ?? [],
        documents: docs.data ?? [],
        training: training.data ?? [],
        employment: employment.data ?? [],
        compliance: (compliance.data ?? []) as PassportCompliance[],
        reputation: (reputation.data ?? []) as PassportReputation[],
        portfolio: (portfolio.data ?? []) as PassportPortfolio[],
        timeline: (timeline.data ?? []) as PassportTimeline[],
        opportunities: (opps.data ?? []) as PassportOpportunity[],
        recommendations: (recs.data ?? []) as CareerRecommendation[],
        verifications: (verifications.data ?? []) as IdentityVerification[],
        permissions: (perms.data ?? []) as PassportPermission[],
      };
    },
  });
}

export function useComplianceItems(passportId?: string) {
  return useQuery({
    queryKey: ["passport-compliance", passportId],
    enabled: !!passportId,
    queryFn: async () => {
      const { data, error } = await supabase.from("passport_compliance")
        .select("*").eq("passport_id", passportId!);
      if (error) throw error;
      return data as PassportCompliance[];
    },
  });
}

export function useUpsertCompliance(passportId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<PassportCompliance> & { requirement_type: string; label: string }) => {
      const { error } = await supabase.from("passport_compliance").insert({ ...row, passport_id: passportId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["passport-compliance", passportId] }),
  });
}

export function usePortfolio(passportId?: string) {
  return useQuery({
    queryKey: ["passport-portfolio", passportId],
    enabled: !!passportId,
    queryFn: async () => {
      const { data, error } = await supabase.from("passport_portfolios")
        .select("*").eq("passport_id", passportId!).order("order_index");
      if (error) throw error;
      return data as PassportPortfolio[];
    },
  });
}

export function useAddPortfolio(passportId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<PassportPortfolio> & { kind: string; title: string }) => {
      const { error } = await supabase.from("passport_portfolios").insert({ ...row, passport_id: passportId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["passport-portfolio", passportId] }),
  });
}

export function useDeletePortfolio(passportId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("passport_portfolios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["passport-portfolio", passportId] }),
  });
}

export function useTimeline(passportId?: string) {
  return useQuery({
    queryKey: ["passport-timeline", passportId],
    enabled: !!passportId,
    queryFn: async () => {
      const { data, error } = await supabase.from("passport_timeline")
        .select("*").eq("passport_id", passportId!).order("event_date", { ascending: false });
      if (error) throw error;
      return data as PassportTimeline[];
    },
  });
}

export function useOpportunities(passportId?: string) {
  return useQuery({
    queryKey: ["passport-opportunities", passportId],
    enabled: !!passportId,
    queryFn: async () => {
      const { data, error } = await supabase.from("passport_opportunities")
        .select("*").eq("passport_id", passportId!).order("score", { ascending: false });
      if (error) throw error;
      return data as PassportOpportunity[];
    },
  });
}

export function useUpdateOpportunity(passportId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("passport_opportunities")
        .update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["passport-opportunities", passportId] }),
  });
}

export function useCareerRecommendations(passportId?: string) {
  return useQuery({
    queryKey: ["passport-career-recs", passportId],
    enabled: !!passportId,
    queryFn: async () => {
      const { data, error } = await supabase.from("career_recommendations")
        .select("*").eq("passport_id", passportId!).order("priority", { ascending: false });
      if (error) throw error;
      return data as CareerRecommendation[];
    },
  });
}

export function useRunCareerCoach(passportId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("passport-career-coach", {
        body: { passport_id: passportId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["passport-career-recs", passportId] });
      qc.invalidateQueries({ queryKey: ["passport-opportunities", passportId] });
    },
  });
}

export function useRecomputeScores(passportId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("passport-recompute", {
        body: { passport_id: passportId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["passport", passportId] }),
  });
}

export function usePermissions(passportId?: string) {
  return useQuery({
    queryKey: ["passport-permissions", passportId],
    enabled: !!passportId,
    queryFn: async () => {
      const { data, error } = await supabase.from("passport_permissions")
        .select("*").eq("passport_id", passportId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data as PassportPermission[];
    },
  });
}

export function useGrantPermission(passportId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      grantee_type: "agency" | "user" | "external";
      grantee_id?: string;
      scopes: string[];
      expires_at?: string | null;
      note?: string;
    }) => {
      const { error } = await supabase.from("passport_permissions").insert({
        passport_id: passportId,
        grantee_type: input.grantee_type,
        grantee_id: input.grantee_id ?? null,
        scopes: input.scopes,
        expires_at: input.expires_at ?? null,
        note: input.note ?? null,
        status: "active",
        granted_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["passport-permissions", passportId] }),
  });
}

export function useRevokePermission(passportId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("passport_permissions")
        .update({ status: "revoked", revoked_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["passport-permissions", passportId] }),
  });
}

export function useApprovePermission(passportId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("passport_permissions")
        .update({ status: "active", granted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["passport-permissions", passportId] }),
  });
}

/** Log an access event (view/download); best-effort, ignore errors. */
export function useLogAccess(passportId?: string) {
  return useMutation({
    mutationFn: async (input: { action: string; resource?: string }) => {
      if (!passportId) return;
      await supabase.from("passport_access_log").insert({
        passport_id: passportId,
        action: input.action,
        resource: input.resource ?? null,
      });
    },
  });
}

export function useAccessLog(passportId?: string) {
  return useQuery({
    queryKey: ["passport-access-log", passportId],
    enabled: !!passportId,
    queryFn: async () => {
      const { data, error } = await supabase.from("passport_access_log")
        .select("*").eq("passport_id", passportId!).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data as PassportAccessLog[];
    },
  });
}
