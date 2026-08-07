// IWOS Phase 5.6B — Unified Communications Workspace
// Taxonomy / contract layer ONLY. No business logic, no API duplication.
// Every runtime capability is served by the existing Communication Fabric
// (ttos_message_threads / ttos_messages / ttos_notifications / ttos_tasks /
// ttos_events / ttos_search_index) and the WOIC cognitive core.

import type { LucideIcon } from "lucide-react";
import {
  Inbox, MessagesSquare, Sparkles, Bell, Megaphone, Radio, Phone, Video,
  ListChecks, Paperclip, History, Search, LayoutTemplate, BarChart3, Settings2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Channels — every source that lands in the unified inbox              */
/* ------------------------------------------------------------------ */

export type CommChannel =
  | "internal" | "email" | "sms" | "ai" | "workflow" | "approval"
  | "system" | "executive" | "compliance" | "training"
  | "recruiting" | "payroll" | "organization";

export const CHANNELS: Array<{ key: CommChannel; label: string; modules: string[] }> = [
  { key: "internal", label: "Internal messages", modules: ["messaging"] },
  { key: "email", label: "Email", modules: ["notifications", "email"] },
  { key: "sms", label: "SMS", modules: ["notifications", "sms"] },
  { key: "ai", label: "AI messages", modules: ["woic", "ai", "cognitive"] },
  { key: "workflow", label: "Workflow notifications", modules: ["automation", "workflow", "ttos"] },
  { key: "approval", label: "Approval requests", modules: ["approvals", "cc", "tickets"] },
  { key: "system", label: "System alerts", modules: ["system", "security", "jobs"] },
  { key: "executive", label: "Executive alerts", modules: ["oic", "executive"] },
  { key: "compliance", label: "Compliance notices", modules: ["compliance", "screening"] },
  { key: "training", label: "Training requests", modules: ["training", "knowledge"] },
  { key: "recruiting", label: "Recruiting messages", modules: ["recruit", "onboarding"] },
  { key: "payroll", label: "Payroll messages", modules: ["pb", "payroll", "billing"] },
  { key: "organization", label: "Organization messages", modules: ["agency", "clients"] },
];

export const CHANNEL_LABEL: Record<CommChannel, string> = CHANNELS.reduce(
  (acc, c) => ({ ...acc, [c.key]: c.label }),
  {} as Record<CommChannel, string>,
);

/** Map a fabric event/notification module onto an inbox channel. */
export function channelForModule(module?: string | null, fallback: CommChannel = "system"): CommChannel {
  const m = (module ?? "").toLowerCase();
  const hit = CHANNELS.find((c) => c.modules.some((x) => m.includes(x)));
  return hit?.key ?? fallback;
}

/* ------------------------------------------------------------------ */
/* Conversation scopes                                                  */
/* ------------------------------------------------------------------ */

export type ConversationScope =
  | "direct" | "group" | "organization" | "department" | "project"
  | "job_order" | "assignment" | "recruiting" | "compliance"
  | "payroll" | "automation" | "ai_agent" | "robot";

export const CONVERSATION_SCOPES: Array<{ key: ConversationScope; label: string; hint: string }> = [
  { key: "direct", label: "One-to-one", hint: "Private conversation between two people" },
  { key: "group", label: "Group", hint: "Ad-hoc group of participants" },
  { key: "organization", label: "Organization", hint: "Whole organization channel" },
  { key: "department", label: "Department", hint: "Department-scoped channel" },
  { key: "project", label: "Project", hint: "Project-scoped channel" },
  { key: "job_order", label: "Job order", hint: "Conversation attached to a job order" },
  { key: "assignment", label: "Assignment", hint: "Conversation attached to an assignment" },
  { key: "recruiting", label: "Recruiting", hint: "Candidate / pipeline conversation" },
  { key: "compliance", label: "Compliance", hint: "Compliance and audit conversation" },
  { key: "payroll", label: "Payroll", hint: "Payroll and billing conversation" },
  { key: "automation", label: "Automation", hint: "Workflow-driven conversation" },
  { key: "ai_agent", label: "AI agent", hint: "Conversation with the WOIC cognitive core" },
  { key: "robot", label: "Future robot", hint: "Reserved for autonomous field agents" },
];

export const SCOPE_LABEL: Record<ConversationScope, string> = CONVERSATION_SCOPES.reduce(
  (acc, s) => ({ ...acc, [s.key]: s.label }),
  {} as Record<ConversationScope, string>,
);

/** Scope is encoded in the thread subject prefix `[scope] subject`. */
export function encodeSubject(scope: ConversationScope, subject: string) {
  return `[${scope}] ${subject}`.trim();
}

export function decodeSubject(raw?: string | null): { scope: ConversationScope; subject: string } {
  const match = /^\[([a-z_]+)\]\s*(.*)$/i.exec(raw ?? "");
  if (match && CONVERSATION_SCOPES.some((s) => s.key === match[1])) {
    return { scope: match[1] as ConversationScope, subject: match[2] || "Untitled" };
  }
  return { scope: "group", subject: raw?.trim() || "Untitled" };
}

/* ------------------------------------------------------------------ */
/* WOIC assistant tasks — each maps to an existing cognitive operation  */
/* ------------------------------------------------------------------ */

export type CognitiveOp =
  | "reason" | "recommend" | "predict" | "explain"
  | "generate_communication" | "retrieve_knowledge" | "evaluate_compliance";

export type AssistantTask = {
  key: string;
  label: string;
  description: string;
  operation: CognitiveOp;
  intent: string;
};

export const ASSISTANT_TASKS: AssistantTask[] = [
  { key: "draft", label: "Draft reply", description: "Compose a reply in the organization's voice", operation: "generate_communication", intent: "draft_reply" },
  { key: "summarize", label: "Summarize", description: "Condense the conversation into key points", operation: "reason", intent: "summarize_conversation" },
  { key: "translate", label: "Translate", description: "Translate the conversation", operation: "generate_communication", intent: "translate" },
  { key: "actions", label: "Action items", description: "Extract commitments and owners", operation: "reason", intent: "extract_action_items" },
  { key: "tasks", label: "Generate tasks", description: "Turn action items into tracked tasks", operation: "recommend", intent: "generate_tasks" },
  { key: "respond", label: "Recommend response", description: "Suggest the best next response", operation: "recommend", intent: "recommend_response" },
  { key: "urgency", label: "Detect urgency", description: "Score urgency and escalation risk", operation: "predict", intent: "detect_urgency" },
  { key: "sentiment", label: "Detect sentiment", description: "Read tone and relationship health", operation: "predict", intent: "detect_sentiment" },
  { key: "explain", label: "Explain decision", description: "Explain a decision referenced here", operation: "explain", intent: "explain_decision" },
  { key: "workflow", label: "Launch workflow", description: "Recommend an automation to run", operation: "recommend", intent: "launch_workflow" },
  { key: "knowledge", label: "Search knowledge", description: "Pull relevant organizational knowledge", operation: "retrieve_knowledge", intent: "search_knowledge" },
  { key: "automation", label: "Create automation", description: "Propose an automation rule", operation: "recommend", intent: "create_automation" },
  { key: "compliance", label: "Compliance check", description: "Evaluate the thread for compliance risk", operation: "evaluate_compliance", intent: "compliance_check" },
];

/* ------------------------------------------------------------------ */
/* Priority + notification categories                                   */
/* ------------------------------------------------------------------ */

export const PRIORITIES = ["critical", "high", "medium", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_TONE: Record<Priority, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  medium: "bg-primary/10 text-primary border-primary/25",
  low: "bg-muted text-muted-foreground border-border",
};

export function normalizePriority(level?: string | null): Priority {
  const l = (level ?? "").toLowerCase();
  return (PRIORITIES as readonly string[]).includes(l) ? (l as Priority) : "medium";
}

/* ------------------------------------------------------------------ */
/* Navigation contract                                                  */
/* ------------------------------------------------------------------ */

export type CommsSection = { to: string; label: string; icon: LucideIcon; end?: boolean };

export const COMMS_SECTIONS: CommsSection[] = [
  { to: "/comms", label: "Inbox", icon: Inbox, end: true },
  { to: "/comms/conversations", label: "Conversations", icon: MessagesSquare },
  { to: "/comms/assistant", label: "AI Assistant", icon: Sparkles },
  { to: "/comms/notifications", label: "Notifications", icon: Bell },
  { to: "/comms/broadcasts", label: "Broadcasts", icon: Radio },
  { to: "/comms/announcements", label: "Announcements", icon: Megaphone },
  { to: "/comms/calls", label: "Calls", icon: Phone },
  { to: "/comms/meetings", label: "Meetings", icon: Video },
  { to: "/comms/tasks", label: "Tasks", icon: ListChecks },
  { to: "/comms/files", label: "Shared Files", icon: Paperclip },
  { to: "/comms/history", label: "History", icon: History },
  { to: "/comms/search", label: "Search", icon: Search },
  { to: "/comms/templates", label: "Templates", icon: LayoutTemplate },
  { to: "/comms/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/comms/settings", label: "Settings", icon: Settings2 },
];

/* Default message templates (workspace-local, user editable). */
export const DEFAULT_TEMPLATES = [
  { id: "shift-confirm", name: "Shift confirmation", channel: "internal" as CommChannel, body: "Hi {{name}}, confirming your shift at {{site}} on {{date}} starting {{time}}. Reply CONFIRM to acknowledge." },
  { id: "ticket-reminder", name: "Ticket signature reminder", channel: "email" as CommChannel, body: "Hello {{client}}, ticket {{ticket_number}} is awaiting your signature. You can review and sign it from your portal." },
  { id: "credential-expiry", name: "Credential expiring", channel: "compliance" as CommChannel, body: "{{name}}, your {{credential}} expires on {{expires_at}}. Please upload a renewal to stay assignable." },
  { id: "payroll-exception", name: "Payroll exception", channel: "payroll" as CommChannel, body: "A payroll exception was raised on run {{run}}: {{reason}}. Please review before approval." },
  { id: "welcome-client", name: "New client welcome", channel: "organization" as CommChannel, body: "Welcome aboard, {{client}}. Your workspace is live — here is how to request workers and approve time tickets." },
];
