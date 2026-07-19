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

export const PASSPORT_TABS = [
  { key: "home", label: "Home", path: "" },
  { key: "identity", label: "Identity", path: "identity" },
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
  { key: "settings", label: "Sharing", path: "settings" },
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
