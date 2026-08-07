// Knowledge Workspace taxonomy — presentation-only classification layer.
// Knowledge itself lives in the Knowledge Intelligence Engine
// (`woic_knowledge_*` tables, served through the woic-api / woic-cognitive
// edge functions). Nothing here performs business logic; it only maps engine
// data onto the workspace's visual sections.

import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Scale,
  ListChecks,
  Gavel,
  GraduationCap,
  BadgeCheck,
  FileText,
  Sparkles,
} from "lucide-react";

/** Workspace-level knowledge kinds, derived from article tags/category slugs. */
export type KnowledgeKind =
  | "article"
  | "policy"
  | "sop"
  | "regulation"
  | "training"
  | "certification"
  | "document";

export interface KnowledgeKindDef {
  key: KnowledgeKind;
  label: string;
  plural: string;
  icon: LucideIcon;
  /** Tag / category slug tokens that classify an article into this kind. */
  match: string[];
  description: string;
}

export const KNOWLEDGE_KINDS: KnowledgeKindDef[] = [
  {
    key: "article",
    label: "Article",
    plural: "Knowledge Base",
    icon: BookOpen,
    match: [],
    description: "Every published and draft article in the knowledge engine.",
  },
  {
    key: "policy",
    label: "Policy",
    plural: "Policies",
    icon: Scale,
    match: ["policy", "policies", "handbook"],
    description: "Organizational policies governing workforce operations.",
  },
  {
    key: "sop",
    label: "SOP",
    plural: "SOPs",
    icon: ListChecks,
    match: ["sop", "procedure", "process", "runbook"],
    description: "Standard operating procedures and runbooks.",
  },
  {
    key: "regulation",
    label: "Regulation",
    plural: "Regulations",
    icon: Gavel,
    match: ["regulation", "osha", "compliance", "legal", "statute"],
    description: "External regulations and statutory requirements.",
  },
  {
    key: "training",
    label: "Training",
    plural: "Training",
    icon: GraduationCap,
    match: ["training", "course", "curriculum", "onboarding"],
    description: "Training curricula and learning content.",
  },
  {
    key: "certification",
    label: "Certification",
    plural: "Certifications",
    icon: BadgeCheck,
    match: ["certification", "certificate", "license", "credential"],
    description: "Certification requirements and credential guidance.",
  },
  {
    key: "document",
    label: "Document",
    plural: "Documents",
    icon: FileText,
    match: ["document", "pdf", "form", "attachment", "contract"],
    description: "Source documents, forms and attachments.",
  },
];

export const KIND_BY_KEY = Object.fromEntries(
  KNOWLEDGE_KINDS.map((k) => [k.key, k]),
) as Record<KnowledgeKind, KnowledgeKindDef>;

/** Lifecycle states supported by the approvals workflow. */
export const KNOWLEDGE_STATUSES = ["draft", "review", "approved", "published", "archived", "retired"] as const;
export type KnowledgeStatus = (typeof KNOWLEDGE_STATUSES)[number];

export const STATUS_TONE: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  published: "default",
  approved: "default",
  review: "secondary",
  draft: "outline",
  archived: "secondary",
  retired: "destructive",
};

/** Classify an article into a workspace kind using its tags. */
export function classifyKind(tags: string[] | null | undefined): KnowledgeKind {
  const lower = (tags ?? []).map((t) => t.toLowerCase());
  for (const kind of KNOWLEDGE_KINDS) {
    if (kind.key === "article") continue;
    if (kind.match.some((m) => lower.some((t) => t.includes(m)))) return kind.key;
  }
  return "article";
}

/** AI assistant capabilities — each maps onto an existing WOIC cognitive op. */
export interface AssistantTask {
  key: string;
  label: string;
  operation:
    | "reason"
    | "explain"
    | "recommend"
    | "generate_report"
    | "generate_communication"
    | "retrieve_knowledge";
  instruction: string;
}

export const ASSISTANT_TASKS: AssistantTask[] = [
  { key: "summarize", label: "Summarize", operation: "generate_report", instruction: "Summarize this knowledge article for an operations manager in under 200 words." },
  { key: "explain", label: "Explain", operation: "explain", instruction: "Explain this knowledge article in plain language for a field worker." },
  { key: "compare", label: "Compare", operation: "reason", instruction: "Compare this article with related organizational knowledge and highlight differences." },
  { key: "translate", label: "Translate (ES)", operation: "generate_communication", instruction: "Translate this knowledge article into clear Latin-American Spanish." },
  { key: "recommend", label: "Recommend", operation: "recommend", instruction: "Recommend related knowledge, training and next actions based on this article." },
  { key: "training", label: "Generate Training", operation: "generate_report", instruction: "Generate a training module outline with objectives, modules and a quiz from this article." },
  { key: "sop", label: "Generate SOP", operation: "generate_report", instruction: "Generate a step-by-step standard operating procedure from this article." },
  { key: "checklist", label: "Generate Checklist", operation: "generate_report", instruction: "Generate an actionable field checklist from this article." },
  { key: "compliance", label: "Compliance Summary", operation: "generate_report", instruction: "Generate a compliance summary describing obligations, owners and evidence required." },
  { key: "gaps", label: "Find Missing Knowledge", operation: "reason", instruction: "Identify knowledge gaps this article leaves unaddressed for the organization." },
  { key: "contradictions", label: "Identify Contradictions", operation: "reason", instruction: "Identify contradictions between this article and other organizational knowledge." },
];

export const SEARCH_MODES = [
  { key: "natural", label: "Natural Language", hint: "Ask a question the way you'd ask a colleague." },
  { key: "keyword", label: "Keyword", hint: "Exact term matching across titles and bodies." },
  { key: "semantic", label: "Semantic", hint: "Meaning-based retrieval from cognitive memory." },
  { key: "similarity", label: "Similarity", hint: "Find knowledge similar to a reference article." },
  { key: "concept", label: "Concept", hint: "Search by concept and tag clusters." },
  { key: "policy", label: "Policy", hint: "Restricted to policies and regulations." },
  { key: "document", label: "Document", hint: "Restricted to source documents." },
  { key: "organization", label: "Organization", hint: "Knowledge scoped to client organizations." },
  { key: "worker", label: "Worker", hint: "Knowledge scoped to workers and roles." },
] as const;
export type SearchMode = (typeof SEARCH_MODES)[number]["key"];

/** Curated collection presets referenced by the Collections section. */
export const COLLECTION_PRESETS = [
  { key: "safety", label: "Safety", tags: ["safety", "ppe", "osha"], icon: Sparkles },
  { key: "hiring", label: "Hiring", tags: ["hiring", "recruiting", "interview"], icon: Sparkles },
  { key: "construction", label: "Construction", tags: ["construction", "site", "trade"], icon: Sparkles },
  { key: "healthcare", label: "Healthcare", tags: ["healthcare", "clinical", "hipaa"], icon: Sparkles },
  { key: "manufacturing", label: "Manufacturing", tags: ["manufacturing", "plant", "machine"], icon: Sparkles },
  { key: "executive", label: "Executive", tags: ["executive", "strategy", "board"], icon: Sparkles },
];
