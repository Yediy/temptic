// IWOS Universal Command Center — command registry.
// Pure declarative layer: navigation targets are derived from the existing
// module registry + shipped routes, quick actions map to existing pages and
// AI commands map to the existing WOIC cognitive operations. No business
// logic lives here — every command only points at an existing route/API.
import {
  Plus, Users, Building2, Briefcase, FileText, DollarSign, CreditCard, Workflow,
  Sparkles, ShieldCheck, IdCard, Brain, Search, Clock, BarChart3, Settings,
  Activity, History, Network, GraduationCap, CalendarRange, MessageSquare, Boxes,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AGENCY_MODULES } from "@/lib/modules";
import type { CognitiveOperation } from "@/hooks/woic/use-cognitive";

export type CommandKind = "navigate" | "action" | "ai" | "record";

export interface CommandDef {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon: LucideIcon;
  kind: CommandKind;
  /** Route to navigate to (navigate/action commands). */
  to?: string;
  /** WOIC cognitive operation (ai commands). */
  operation?: CognitiveOperation;
  /** Permission module key checked against role_permissions. */
  permission?: string;
  keywords?: string[];
}

/** Quick actions — every target is an existing route in App.tsx. */
export const QUICK_ACTIONS: CommandDef[] = [
  { id: "qa.worker", label: "Create Worker", group: "Quick Actions", icon: Users, kind: "action", to: "/talent", permission: "talent", keywords: ["talent", "candidate", "new"] },
  { id: "qa.org", label: "Create Organization", group: "Quick Actions", icon: Building2, kind: "action", to: "/clients", permission: "clients", keywords: ["client", "company", "new"] },
  { id: "qa.job", label: "Create Job Order", group: "Quick Actions", icon: Briefcase, kind: "action", to: "/jobs", permission: "jobs", keywords: ["requisition", "order", "new"] },
  { id: "qa.assignment", label: "Create Assignment", group: "Quick Actions", icon: CalendarRange, kind: "action", to: "/scheduling", permission: "scheduling", keywords: ["shift", "schedule", "place"] },
  { id: "qa.ticket", label: "Create Time Ticket", group: "Quick Actions", icon: FileText, kind: "action", to: "/tickets/create", permission: "tickets", keywords: ["daily", "labor"] },
  { id: "qa.invoice", label: "Create Invoice", group: "Quick Actions", icon: CreditCard, kind: "action", to: "/pb/invoices", keywords: ["bill", "billing", "ar"] },
  { id: "qa.payroll", label: "Create Payroll Run", group: "Quick Actions", icon: DollarSign, kind: "action", to: "/pb/payroll-runs", keywords: ["pay", "run", "wages"] },
  { id: "qa.workflow", label: "Create Workflow", group: "Quick Actions", icon: Workflow, kind: "action", to: "/automation/workflows/new", keywords: ["builder", "process"] },
  { id: "qa.automation", label: "Create Automation Rule", group: "Quick Actions", icon: Sparkles, kind: "action", to: "/automation/rules", keywords: ["trigger", "rule"] },
  { id: "qa.assistant", label: "Launch AI Assistant", group: "Quick Actions", icon: Brain, kind: "action", to: "/ai-center", permission: "ai_center", keywords: ["woic", "copilot"] },
  { id: "qa.screening", label: "Start Background Check", group: "Quick Actions", icon: ShieldCheck, kind: "action", to: "/screening", permission: "compliance", keywords: ["screening", "check"] },
  { id: "qa.passport", label: "Open Workforce Passport", group: "Quick Actions", icon: IdCard, kind: "action", to: "/passport", keywords: ["credentials", "badges"] },
  { id: "qa.twin", label: "Open Digital Twin", group: "Quick Actions", icon: Users, kind: "action", to: "/twin", keywords: ["simulation", "career"] },
  { id: "qa.onboarding", label: "Start Onboarding", group: "Quick Actions", icon: GraduationCap, kind: "action", to: "/onboarding-os", keywords: ["hire", "paperwork"] },
];

/** Destinations outside the sidebar module registry. */
export const EXTRA_DESTINATIONS: CommandDef[] = [
  { id: "go.timeline", label: "Universal Timeline", group: "Go to", icon: History, kind: "navigate", to: "/timeline" },
  { id: "go.simulation", label: "Simulation Workspace", group: "Go to", icon: Activity, kind: "navigate", to: "/simulation", keywords: ["scenario", "what if", "forecast"] },
  { id: "go.autonomy", label: "Autonomous Operations", group: "Go to", icon: Activity, kind: "navigate", to: "/autonomy", keywords: ["autonomy", "agents", "coordination", "operations"] },
  { id: "go.autonomy.coordinations", label: "Open Coordination Map", group: "Go to", icon: Activity, kind: "navigate", to: "/autonomy/coordinations", keywords: ["coordination", "live", "map"] },
  { id: "go.autonomy.approvals", label: "Show Approval Queue", group: "Go to", icon: Activity, kind: "navigate", to: "/autonomy/approvals", keywords: ["approval", "approve", "queue"] },
  { id: "go.autonomy.intervention", label: "Pause or Intervene in a Coordination", group: "Go to", icon: Activity, kind: "navigate", to: "/autonomy/intervention", keywords: ["pause", "kill switch", "intervene", "stop"] },
  { id: "go.autonomy.authority", label: "Show Actor Authority", group: "Go to", icon: Activity, kind: "navigate", to: "/autonomy/authority", keywords: ["authority", "envelope", "permission"] },
  { id: "go.autonomy.escalations", label: "Show Escalations", group: "Go to", icon: Activity, kind: "navigate", to: "/autonomy/escalations", keywords: ["escalation", "urgent"] },
  { id: "go.autonomy.ledger", label: "Show Autonomy Ledger", group: "Go to", icon: Activity, kind: "navigate", to: "/autonomy/ledger", keywords: ["ledger", "audit", "governance"] },
  { id: "go.optimization", label: "Optimization Workspace", group: "Go to", icon: Activity, kind: "navigate", to: "/optimization", keywords: ["optimize", "objectives", "constraints", "strategy", "pareto"] },
  { id: "go.optimization.objectives", label: "Define Optimization Objectives", group: "Go to", icon: Activity, kind: "navigate", to: "/optimization/objectives", keywords: ["objective", "goal", "weight"] },
  { id: "go.optimization.strategies", label: "Explore Optimization Strategies", group: "Go to", icon: Activity, kind: "navigate", to: "/optimization/strategies", keywords: ["strategy", "recommendation"] },
  { id: "go.cognition", label: "WOIC Intelligence — Show Active Cognition", group: "Go to", icon: Activity, kind: "navigate", to: "/cognition", keywords: ["woic", "cognition", "cognitive", "intelligence", "active cognition"] },
  { id: "go.cognition.requests", label: "Open Cognitive Request", group: "Go to", icon: Activity, kind: "navigate", to: "/cognition/requests", keywords: ["cognitive request", "inspector", "operation"] },
  { id: "go.cognition.lowconf", label: "Show Low-Confidence Requests", group: "Go to", icon: Activity, kind: "navigate", to: "/cognition/uncertainty", keywords: ["low confidence", "uncertainty", "unknown"] },
  { id: "go.cognition.contradictions", label: "Show Contradictions", group: "Go to", icon: Activity, kind: "navigate", to: "/cognition/contradictions", keywords: ["contradiction", "conflict", "evidence conflict"] },
  { id: "go.cognition.models", label: "Show Model Health", group: "Go to", icon: Activity, kind: "navigate", to: "/cognition/models", keywords: ["model", "provider", "health", "fallback"] },
  { id: "go.cognition.budgets", label: "Show Expensive Cognitive Sessions", group: "Go to", icon: Activity, kind: "navigate", to: "/cognition/budgets", keywords: ["budget", "cost", "expensive", "tokens"] },
  { id: "go.cognition.faculties", label: "Show Failed Faculties", group: "Go to", icon: Activity, kind: "navigate", to: "/cognition/faculties", keywords: ["faculty", "degraded", "unavailable", "failed"] },
  { id: "go.cognition.evidence", label: "Explain Evidence Behind a Claim", group: "Go to", icon: Activity, kind: "navigate", to: "/cognition/evidence", keywords: ["evidence", "provenance", "claim", "why"] },
  { id: "go.cognition.escalations", label: "Show Cognitive Escalations", group: "Go to", icon: Activity, kind: "navigate", to: "/cognition/escalations", keywords: ["escalation", "human review", "cognitive"] },
  { id: "go.perception", label: "WOIC Perception — Show What WOIC Observed", group: "Go to", icon: Activity, kind: "navigate", to: "/perception", keywords: ["perception", "context", "observed", "woic"] },
  { id: "go.perception.observations", label: "Show Live Observations", group: "Go to", icon: Activity, kind: "navigate", to: "/perception/observations", keywords: ["observation", "signal", "stream", "provenance"] },
  { id: "go.perception.packs", label: "Show Context Packs", group: "Go to", icon: Activity, kind: "navigate", to: "/perception/context-packs", keywords: ["context pack", "assembled context", "coverage"] },
  { id: "go.perception.entities", label: "Show Entity Resolution", group: "Go to", icon: Activity, kind: "navigate", to: "/perception/entities", keywords: ["entity", "resolution", "ambiguous", "match"] },
  { id: "go.perception.relevance", label: "Show What Context Was Ignored", group: "Go to", icon: Activity, kind: "navigate", to: "/perception/relevance", keywords: ["relevance", "excluded", "ignored", "included"] },
  { id: "go.perception.attention", label: "Show High-Salience Signals", group: "Go to", icon: Activity, kind: "navigate", to: "/perception/attention", keywords: ["salience", "attention", "urgent", "impact"] },
  { id: "go.perception.contradictions", label: "Show Perception Contradictions", group: "Go to", icon: Activity, kind: "navigate", to: "/perception/contradictions", keywords: ["contradiction", "conflict", "source disagreement"] },
  { id: "go.perception.missing", label: "Show Missing Information", group: "Go to", icon: Activity, kind: "navigate", to: "/perception/missing", keywords: ["missing", "gap", "unknown", "blocking"] },
  { id: "go.perception.freshness", label: "Show Stale Context", group: "Go to", icon: Activity, kind: "navigate", to: "/perception/freshness", keywords: ["freshness", "stale", "expired", "aging"] },
  { id: "go.perception.sources", label: "Show Perception Source Health", group: "Go to", icon: Activity, kind: "navigate", to: "/perception/sources", keywords: ["source", "adapter", "ingest", "health"] },
  { id: "go.architecture", label: "Architecture & Governance Console", group: "Go to", icon: Boxes, kind: "navigate", to: "/architecture", keywords: ["architecture", "organism", "governance", "engineering map"] },
  { id: "go.architecture.organisms", label: "Show Platform Organisms", group: "Go to", icon: Boxes, kind: "navigate", to: "/architecture/organisms", keywords: ["organism", "service", "module"] },
  { id: "go.architecture.dependencies", label: "Explore Dependencies", group: "Go to", icon: Boxes, kind: "navigate", to: "/architecture/dependencies", keywords: ["dependency", "upstream", "downstream"] },
  { id: "go.architecture.impact", label: "Run Change Impact Analysis", group: "Go to", icon: Boxes, kind: "navigate", to: "/architecture/impact", keywords: ["impact", "breaking change", "radius"] },
  { id: "go.architecture.contracts", label: "Show Platform Contracts", group: "Go to", icon: Boxes, kind: "navigate", to: "/architecture/contracts", keywords: ["contract", "capspec", "dna"] },
  { id: "go.architecture.constitution", label: "Open the Constitution", group: "Go to", icon: Boxes, kind: "navigate", to: "/architecture/constitution", keywords: ["constitution", "article", "governance"] },
  { id: "go.architecture.health", label: "Show Architecture Health", group: "Go to", icon: Boxes, kind: "navigate", to: "/architecture/health", keywords: ["drift", "violation", "debt", "health"] },
  { id: "go.architecture.search", label: "Search the Architecture Registry", group: "Go to", icon: Search, kind: "navigate", to: "/architecture/search", keywords: ["engineering search", "registry", "locate"] },
  { id: "go.activity", label: "System Activity Center", group: "Go to", icon: Activity, kind: "navigate", to: "/activity" },
  { id: "go.oic", label: "Operational Intelligence Center", group: "Go to", icon: BarChart3, kind: "navigate", to: "/oic" },
  { id: "go.graph", label: "Workforce Graph", group: "Go to", icon: Network, kind: "navigate", to: "/graph" },
  { id: "go.graph.overview", label: "Platform Graph Overview", group: "Go to", icon: Network, kind: "navigate", to: "/graph/overview", keywords: ["graph", "executive", "platform"] },
  { id: "go.graph.search", label: "Graph Search", group: "Go to", icon: Network, kind: "navigate", to: "/graph/search", keywords: ["graph", "shortest path", "similarity"] },
  { id: "go.graph.impact", label: "Graph Impact Analysis", group: "Go to", icon: Network, kind: "navigate", to: "/graph/impact", keywords: ["graph", "cascade", "what if"] },
  { id: "go.graph.dependencies", label: "Graph Dependencies", group: "Go to", icon: Network, kind: "navigate", to: "/graph/dependencies", keywords: ["graph", "critical", "failure"] },
  { id: "go.automation", label: "Automation Studio", group: "Go to", icon: Sparkles, kind: "navigate", to: "/automation" },
  { id: "go.woic", label: "WOIC Cognitive Core", group: "Go to", icon: Brain, kind: "navigate", to: "/woic/cognitive" },
  { id: "go.recruit", label: "Recruit OS", group: "Go to", icon: Search, kind: "navigate", to: "/recruit" },
  { id: "go.tto", label: "Time Ticket OS", group: "Go to", icon: Clock, kind: "navigate", to: "/tto" },
  { id: "go.pb", label: "Payroll & Billing OS", group: "Go to", icon: DollarSign, kind: "navigate", to: "/pb" },
  { id: "go.messages", label: "Messages", group: "Go to", icon: MessageSquare, kind: "navigate", to: "/ttos/messages" },
  { id: "go.security", label: "Security & 2FA", group: "Go to", icon: ShieldCheck, kind: "navigate", to: "/security" },
  { id: "go.settings", label: "Organization Settings", group: "Go to", icon: Settings, kind: "navigate", to: "/ttos/settings" },
];

/** WOIC cognitive operations exposed as first-class commands. */
export const AI_COMMANDS: CommandDef[] = [
  { id: "ai.explain", label: "Explain", hint: "Explain a decision, event or recommendation", group: "AI (WOIC)", icon: Brain, kind: "ai", operation: "explain" },
  { id: "ai.recommend", label: "Recommend", hint: "Recommend next best actions", group: "AI (WOIC)", icon: Sparkles, kind: "ai", operation: "recommend" },
  { id: "ai.predict", label: "Predict", hint: "Forecast an outcome", group: "AI (WOIC)", icon: BarChart3, kind: "ai", operation: "predict" },
  { id: "ai.summarize", label: "Summarize", hint: "Summarize activity or a record", group: "AI (WOIC)", icon: FileText, kind: "ai", operation: "generate_report" },
  { id: "ai.optimize", label: "Optimize", hint: "Optimize a plan or schedule", group: "AI (WOIC)", icon: Workflow, kind: "ai", operation: "reason" },
  { id: "ai.generate", label: "Generate", hint: "Generate a communication or document", group: "AI (WOIC)", icon: Plus, kind: "ai", operation: "generate_communication" },
  { id: "ai.compare", label: "Compare", hint: "Compare records or scenarios", group: "AI (WOIC)", icon: BarChart3, kind: "ai", operation: "reason" },
  { id: "ai.find", label: "Find", hint: "Semantic search across knowledge", group: "AI (WOIC)", icon: Search, kind: "ai", operation: "retrieve_knowledge" },
  { id: "ai.detect", label: "Detect", hint: "Detect risk or compliance issues", group: "AI (WOIC)", icon: ShieldCheck, kind: "ai", operation: "evaluate_compliance" },
  { id: "ai.translate", label: "Translate", hint: "Translate content", group: "AI (WOIC)", icon: MessageSquare, kind: "ai", operation: "generate_communication" },
  { id: "ai.analyze", label: "Analyze", hint: "Analyze a scenario end to end", group: "AI (WOIC)", icon: Brain, kind: "ai", operation: "simulate" },
];

/** Module navigation derived from the single existing module registry. */
export function moduleCommands(): CommandDef[] {
  return AGENCY_MODULES.map((m) => ({
    id: `mod.${m.key}`,
    label: m.label,
    group: "Go to",
    icon: m.icon,
    kind: "navigate" as const,
    to: m.path,
    permission: m.permission,
    keywords: [m.key],
  }));
}

export function allCommands(): CommandDef[] {
  return [...QUICK_ACTIONS, ...moduleCommands(), ...EXTRA_DESTINATIONS, ...AI_COMMANDS];
}

/** Lightweight subsequence fuzzy score. Higher is better, -1 = no match. */
export function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase();
  if (!q) return 0;
  if (t.includes(q)) return 100 - t.indexOf(q);
  let qi = 0;
  let score = 0;
  let streak = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) { qi++; streak++; score += 2 + streak; }
    else streak = 0;
  }
  return qi === q.length ? score : -1;
}

export function rankCommands(query: string, commands: CommandDef[]): CommandDef[] {
  if (!query.trim()) return commands;
  return commands
    .map((c) => ({ c, s: Math.max(fuzzyScore(query, c.label), ...(c.keywords ?? []).map((k) => fuzzyScore(query, k) - 10)) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.c);
}

/** Natural-language heuristic: sentences / questions route to WOIC. */
export function looksNaturalLanguage(q: string): boolean {
  const t = q.trim();
  if (t.length < 12) return false;
  if (/[?]/.test(t)) return true;
  return t.split(/\s+/).length >= 4;
}
