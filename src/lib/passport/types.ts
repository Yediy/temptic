import type { Tables } from "@/integrations/supabase/types";

export type WorkforcePassport = Tables<"workforce_passports">;
export type PassportPermission = Tables<"passport_permissions">;
export type IdentityVerification = Tables<"identity_verifications">;
export type PassportCompliance = Tables<"passport_compliance">;
export type PassportReputation = Tables<"passport_reputation">;
export type PassportPortfolio = Tables<"passport_portfolios">;
export type PassportTimeline = Tables<"passport_timeline">;
export type PassportOpportunity = Tables<"passport_opportunities">;
export type CareerRecommendation = Tables<"career_recommendations">;
export type PassportAccessLog = Tables<"passport_access_log">;

export interface PassportSharingLink {
  id: string;
  passport_id: string;
  token_hash: string;
  label: string | null;
  scopes: string[];
  expires_at: string | null;
  revoked_at: string | null;
  view_count: number;
  last_viewed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PassportVerification {
  id: string;
  passport_id: string;
  verification_type: string;
  status: string;
  verifier: string | null;
  evidence_url: string | null;
  metadata: Record<string, unknown>;
  verified_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PassportBadge {
  id: string;
  passport_id: string;
  badge_key: string;
  name: string;
  description: string | null;
  icon: string | null;
  tier: string | null;
  awarded_by: string | null;
  metadata: Record<string, unknown>;
  awarded_at: string;
  created_at: string;
}

export const VERIFICATION_TYPES = [
  { key: "government_id", label: "Government ID" },
  { key: "work_authorization", label: "Work Authorization" },
  { key: "identity", label: "Identity" },
  { key: "address", label: "Address" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "education", label: "Education" },
  { key: "reference", label: "Reference" },
] as const;

export const PASSPORT_TABS = [
  { key: "home", label: "Home", path: "" },
  { key: "identity", label: "Identity", path: "identity" },
  { key: "verifications", label: "Verifications", path: "verifications" },
  { key: "badges", label: "Badges", path: "badges" },
  { key: "skills", label: "Skills", path: "skills" },
  { key: "certifications", label: "Certifications", path: "certifications" },
  { key: "training", label: "Training", path: "training" },
  { key: "employment", label: "Employment", path: "employment" },
  { key: "compliance", label: "Compliance", path: "compliance" },
  { key: "documents", label: "Documents", path: "documents" },
  { key: "portfolio", label: "Portfolio", path: "portfolio" },
  { key: "timeline", label: "Timeline", path: "timeline" },
  { key: "coach", label: "Career Coach", path: "coach" },
  { key: "opportunities", label: "Opportunities", path: "opportunities" },
  { key: "sharing", label: "Sharing", path: "sharing" },
  { key: "settings", label: "Privacy", path: "settings" },
] as const;

export const REPUTATION_CATEGORIES = [
  "attendance", "reliability", "punctuality", "safety", "quality",
  "communication", "leadership", "teamwork", "customer", "completion",
] as const;

export const COMPLIANCE_REQUIREMENTS = [
  { key: "i9", label: "I-9 Employment Eligibility" },
  { key: "w4", label: "W-4 Tax Withholding" },
  { key: "w9", label: "W-9 Contractor" },
  { key: "background", label: "Background Check" },
  { key: "drug_screen", label: "Drug Screen" },
  { key: "policy", label: "Policy Acknowledgment" },
  { key: "safety", label: "Safety Agreement" },
  { key: "nda", label: "Non-Disclosure Agreement" },
] as const;
