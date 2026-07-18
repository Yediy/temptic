export interface RecruitCandidateScore {
  id: string;
  agency_id: string;
  worker_id: string;
  reliability_score: number;
  reputation_score: number;
  performance_score: number;
  factors: Record<string, unknown>;
  last_computed_at: string;
}

export interface RecruitTalentPreferences {
  id: string;
  agency_id: string;
  worker_id: string;
  preferred_roles: string[];
  preferred_locations: string[];
  min_pay_rate: number | null;
  max_travel_miles: number | null;
  availability: Record<string, unknown>;
  remote_ok: boolean;
  marketplace_opt_in: boolean;
}

export interface RecruitOpportunity {
  id: string;
  agency_id: string;
  job_order_id: string | null;
  kind: "job" | "training" | "certification" | "advancement";
  visibility: "public" | "invited" | "network";
  title: string;
  description: string | null;
  payload: Record<string, unknown>;
  published_at: string | null;
  expires_at: string | null;
}

export interface RecruitPipeline {
  id: string; agency_id: string; name: string; is_default: boolean; job_order_id: string | null;
}
export interface RecruitPipelineStage {
  id: string; pipeline_id: string; key: string; label: string; position: number;
  stage_type: "sourcing" | "screening" | "interview" | "submission" | "offer" | "onboarding" | "active" | "closed";
}
export interface RecruitPipelineEntry {
  id: string; agency_id: string; pipeline_id: string; stage_id: string; worker_id: string;
  job_order_id: string | null; submission_id: string | null; assignment_id: string | null;
  notes: string | null; entered_at: string;
}

export interface RecruitClientContact {
  id: string; agency_id: string; client_id: string; name: string; title: string | null;
  email: string | null; phone: string | null; is_primary: boolean; preferences: Record<string, unknown>;
}
