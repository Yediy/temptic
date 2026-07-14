import {
  LayoutDashboard, Users, Briefcase, ClipboardCheck, ShieldCheck, GraduationCap,
  CalendarRange, FileText, Clock, DollarSign, CreditCard, Building2, Sparkles,
  BarChart3, Network, Settings, Home, Search, User, Award, FileBadge, CalendarDays,
  MessageSquare, Wallet, EyeOff
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Portal = "agency" | "client" | "worker";
export type ModuleStatus = "live" | "phase2" | "phase3" | "phase4";

export interface ModuleDef {
  key: string;
  label: string;
  path: string;
  icon: LucideIcon;
  portal: Portal;
  /** Module key checked against role_permissions.module */
  permission: string;
  status: ModuleStatus;
  /** Group in sidebar (agency portal only) */
  group?: "workforce" | "operations" | "finance" | "insights" | "admin";
  /** Priority for mobile bottom nav (lower = more prominent) */
  mobilePriority?: number;
}

/**
 * Agency portal: the full 16-module Workforce OS shell.
 * "live" modules route to real pages; other modules route to a disclosed
 * placeholder page that explains which phase ships them.
 */
export const AGENCY_MODULES: ModuleDef[] = [
  { key: "command_center", label: "Command Center", path: "/", icon: LayoutDashboard, portal: "agency", permission: "command_center", status: "live", group: "workforce", mobilePriority: 1 },
  { key: "talent",         label: "Talent",         path: "/talent", icon: Users, portal: "agency", permission: "talent", status: "live", group: "workforce", mobilePriority: 2 },
  { key: "jobs",           label: "Jobs",           path: "/jobs", icon: Briefcase, portal: "agency", permission: "jobs", status: "live", group: "workforce" },
  { key: "candidates",     label: "Blind Review",   path: "/candidates", icon: EyeOff, portal: "agency", permission: "jobs", status: "live", group: "workforce" },
  { key: "screening",      label: "Screening",      path: "/screening", icon: ShieldCheck, portal: "agency", permission: "compliance", status: "live", group: "workforce" },
  { key: "onboarding",     label: "Onboarding",     path: "/onboarding", icon: ClipboardCheck, portal: "agency", permission: "onboarding", status: "phase2", group: "workforce" },
  { key: "compliance",     label: "Compliance",     path: "/compliance", icon: ShieldCheck, portal: "agency", permission: "compliance", status: "phase2", group: "workforce" },
  { key: "training",       label: "Training",       path: "/training", icon: GraduationCap, portal: "agency", permission: "training", status: "phase2", group: "workforce" },
  { key: "scheduling",     label: "Scheduling",     path: "/scheduling", icon: CalendarRange, portal: "agency", permission: "scheduling", status: "phase4", group: "operations" },
  { key: "tickets",        label: "Tickets",        path: "/tickets", icon: FileText, portal: "agency", permission: "tickets", status: "live", group: "operations", mobilePriority: 3 },
  { key: "timecards",      label: "Timecards",      path: "/timecards", icon: Clock, portal: "agency", permission: "timecards", status: "phase4", group: "operations" },
  { key: "payroll",        label: "Payroll",        path: "/payroll", icon: DollarSign, portal: "agency", permission: "payroll", status: "phase4", group: "finance" },
  { key: "billing",        label: "Billing",        path: "/billing", icon: CreditCard, portal: "agency", permission: "billing", status: "live", group: "finance", mobilePriority: 4 },
  { key: "clients",        label: "Clients",        path: "/clients", icon: Building2, portal: "agency", permission: "clients", status: "live", group: "operations" },
  { key: "ai_center",      label: "AI Center",      path: "/ai-center", icon: Sparkles, portal: "agency", permission: "ai_center", status: "phase4", group: "insights" },
  { key: "reports",        label: "Reports",        path: "/reports", icon: BarChart3, portal: "agency", permission: "reports", status: "phase4", group: "insights" },
  { key: "network",        label: "Network",        path: "/network", icon: Network, portal: "agency", permission: "network", status: "phase4", group: "insights" },
  { key: "settings",       label: "Settings",       path: "/settings", icon: Settings, portal: "agency", permission: "settings", status: "phase2", group: "admin" },
];

export const CLIENT_MODULES: ModuleDef[] = [
  { key: "c_dashboard",   label: "Dashboard",         path: "/client", icon: LayoutDashboard, portal: "client", permission: "*", status: "live", mobilePriority: 1 },
  { key: "c_job_orders",  label: "Job Orders",        path: "/client/job-orders", icon: Briefcase, portal: "client", permission: "*", status: "phase3" },
  { key: "c_talent",      label: "Talent Search",     path: "/client/talent", icon: Search, portal: "client", permission: "*", status: "phase3" },
  { key: "c_candidates",  label: "Candidate Review",  path: "/client/candidates", icon: Users, portal: "client", permission: "*", status: "phase3" },
  { key: "c_placements",  label: "Placements",        path: "/client/placements", icon: Award, portal: "client", permission: "*", status: "phase3" },
  { key: "c_active",      label: "Active Workers",    path: "/client/workers", icon: Users, portal: "client", permission: "*", status: "phase3" },
  { key: "c_schedule",    label: "Scheduling",        path: "/client/scheduling", icon: CalendarRange, portal: "client", permission: "*", status: "phase4" },
  { key: "c_tickets",     label: "Ticket Approvals",  path: "/client/pending", icon: FileText, portal: "client", permission: "*", status: "live", mobilePriority: 2 },
  { key: "c_timecards",   label: "Timecard Approvals",path: "/client/timecards", icon: Clock, portal: "client", permission: "*", status: "phase4" },
  { key: "c_invoices",    label: "Invoices",          path: "/client/invoices", icon: FileBadge, portal: "client", permission: "*", status: "phase4", mobilePriority: 3 },
  { key: "c_payments",    label: "Payments",          path: "/client/payments", icon: Wallet, portal: "client", permission: "*", status: "phase4" },
  { key: "c_reports",     label: "Reports",           path: "/client/reports", icon: BarChart3, portal: "client", permission: "*", status: "phase4" },
  { key: "c_messages",    label: "Messages",          path: "/client/messages", icon: MessageSquare, portal: "client", permission: "*", status: "phase4", mobilePriority: 4 },
];

export const WORKER_MODULES: ModuleDef[] = [
  { key: "w_home",       label: "Home",              path: "/worker", icon: Home, portal: "worker", permission: "*", status: "live", mobilePriority: 1 },
  { key: "w_jobs",       label: "Find Jobs",         path: "/worker/jobs", icon: Search, portal: "worker", permission: "*", status: "phase3", mobilePriority: 2 },
  { key: "w_apps",       label: "My Applications",   path: "/worker/applications", icon: Briefcase, portal: "worker", permission: "*", status: "phase3" },
  { key: "w_passport",   label: "Workforce Passport",path: "/worker/passport", icon: User, portal: "worker", permission: "*", status: "live", mobilePriority: 3 },
  { key: "w_onboarding", label: "Onboarding",        path: "/worker/onboarding", icon: ClipboardCheck, portal: "worker", permission: "*", status: "phase2" },
  { key: "w_docs",       label: "Documents",         path: "/worker/documents", icon: FileText, portal: "worker", permission: "*", status: "phase2" },
  { key: "w_creds",      label: "Credentials",       path: "/worker/credentials", icon: Award, portal: "worker", permission: "*", status: "live" },
  { key: "w_training",   label: "Training",          path: "/worker/training", icon: GraduationCap, portal: "worker", permission: "*", status: "phase2" },
  { key: "w_schedule",   label: "Schedule",          path: "/worker/schedule", icon: CalendarDays, portal: "worker", permission: "*", status: "phase4" },
  { key: "w_tickets",    label: "Tickets",           path: "/worker", icon: FileText, portal: "worker", permission: "*", status: "live" },
  { key: "w_timecards",  label: "Timecards",         path: "/worker/hours", icon: Clock, portal: "worker", permission: "*", status: "live", mobilePriority: 4 },
  { key: "w_pay",        label: "Pay",               path: "/worker/pay", icon: DollarSign, portal: "worker", permission: "*", status: "phase4" },
  { key: "w_messages",   label: "Messages",          path: "/worker/messages", icon: MessageSquare, portal: "worker", permission: "*", status: "phase4" },
];

export const GROUP_LABELS: Record<NonNullable<ModuleDef["group"]>, string> = {
  workforce: "Workforce",
  operations: "Operations",
  finance: "Finance",
  insights: "Insights",
  admin: "Administration",
};

export const PHASE_LABELS: Record<ModuleStatus, string> = {
  live: "Available",
  phase2: "Phase 2 – Onboarding & Training",
  phase3: "Phase 3 – Jobs, Blind Review & Screening",
  phase4: "Phase 4 – Scheduling, Payroll polish & Automation",
};
