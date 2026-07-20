export interface OnboardingSession {
  id: string;
  agency_id: string;
  worker_id: string;
  checklist_id: string | null;
  status: "in_progress" | "paused" | "completed" | "abandoned";
  current_step: string | null;
  progress_pct: number;
  started_at: string;
  last_activity_at: string;
  completed_at: string | null;
}

export interface ClientRequirement {
  id: string;
  agency_id: string;
  client_id: string;
  name: string;
  forms: Array<{ key: string; label: string; required: boolean }>;
  training_course_ids: string[];
  policy_ids: string[];
  required_certifications: string[];
  required_licenses: string[];
  screening_package_id: string | null;
  drug_screen_required: boolean;
  background_required: boolean;
  active: boolean;
}

export interface AssignmentReadiness {
  id: string;
  agency_id: string;
  worker_id: string;
  client_id: string | null;
  score: number;
  ready: boolean;
  breakdown: Record<string, { done: boolean; weight: number; label: string }>;
  missing: Array<{ key: string; label: string; action?: string }>;
  computed_at: string;
}

export const ONBOARDING_STEPS = [
  { key: "identity", label: "Identity verification" },
  { key: "eligibility", label: "Employment eligibility (I-9)" },
  { key: "tax_forms", label: "Tax forms (W-4 / W-9)" },
  { key: "direct_deposit", label: "Direct deposit" },
  { key: "emergency_contact", label: "Emergency contact" },
  { key: "documents", label: "ID & work-auth documents" },
  { key: "background", label: "Background check" },
  { key: "drug_screen", label: "Drug screen" },
  { key: "training", label: "Required training" },
  { key: "policies", label: "Policy acknowledgements" },
  { key: "signatures", label: "Digital signatures" },
] as const;

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]["key"];
