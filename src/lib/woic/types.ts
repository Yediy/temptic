// Typed shapes returned by the woic-api edge function.
// Fields mirror the underlying `woic_*` tables so panels can render with
// consistent columns and detail views without ad-hoc casting.

export interface WoicIdentity {
  id: string;
  auth_user_id: string | null;
  display_name: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  skills: unknown;
  certifications: unknown;
  licenses: unknown;
  education: unknown;
  employment_history: unknown;
  training_history: unknown;
  documents: unknown;
  communication_prefs: unknown;
  security_settings: unknown;
  ai_profile: unknown;
  behavior_profile: unknown;
  knowledge_profile: unknown;
  reputation_score: number | null;
  activity_score: number | null;
  availability: unknown;
  created_at: string;
  updated_at: string;
}

export interface WoicIdentityMembership {
  id: string;
  identity_id: string;
  agency_id: string;
  kind: string;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface WoicKnowledgeArticle {
  id: string;
  agency_id: string;
  category_id: string | null;
  title: string;
  body: string | null;
  tags: string[] | null;
  permissions: Record<string, unknown> | null;
  version: number;
  status: "draft" | "published" | "archived" | string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WoicDecision {
  id: string;
  agency_id: string;
  kind: string;
  subject_entity: string;
  subject_id: string;
  confidence: number | null;
  reasoning: string | null;
  alternative_options: unknown;
  risk: string | null;
  impact: string | null;
  outcome: string | null;
  approver_id: string | null;
  source: Record<string, unknown> | null;
  created_at: string;
}

export interface WoicRecommendation {
  id: string;
  agency_id: string;
  kind: string;
  subject_entity: string;
  subject_id: string;
  target_entity: string;
  target_id: string;
  score: number;
  reasoning: string | null;
  why: Record<string, unknown> | null;
  status: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WoicPredictionModel {
  id: string;
  agency_id: string | null;
  name: string;
  version: string;
  feature_set: unknown;
  endpoint: string | null;
  status: string;
  description: string | null;
  created_at: string;
}

export interface WoicPredictionResult {
  id: string;
  agency_id: string;
  model_id: string;
  subject_entity: string;
  subject_id: string;
  prediction: Record<string, unknown> | null;
  confidence: number | null;
  features_snapshot: Record<string, unknown> | null;
  produced_at: string;
}

export interface WoicLearningRecord {
  id: string;
  agency_id: string;
  kind: string;
  subject_entity: string;
  subject_id: string;
  prediction_id: string | null;
  outcome: Record<string, unknown> | null;
  created_at: string;
}

export interface WoicComplianceEvent {
  id: string;
  agency_id: string;
  identity_id: string | null;
  rule_id: string | null;
  status: "open" | "resolved" | "waived" | string;
  effective_at: string | null;
  expires_at: string | null;
  next_action_at: string | null;
  evidence_url: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}
