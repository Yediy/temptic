import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { ClientLayout } from "@/components/ClientLayout";
import { WorkerLayout } from "@/components/WorkerLayout";

// Auth pages
import AgencyLogin from "@/pages/auth/AgencyLogin";
import ClientLogin from "@/pages/auth/ClientLogin";
import WorkerLogin from "@/pages/auth/WorkerLogin";
import Register from "@/pages/auth/Register";
import Unauthorized from "@/pages/Unauthorized";
import AgencyForgotPassword from "@/pages/auth/AgencyForgotPassword";
import AgencyResetPassword from "@/pages/auth/AgencyResetPassword";

// Agency pages
import Dashboard from "@/pages/Dashboard";
import Tickets from "@/pages/Tickets";
import CreateTicket from "@/pages/CreateTicket";
import CreateWeeklyTicket from "@/pages/CreateWeeklyTicket";
import TicketDetail from "@/pages/TicketDetail";
import EditTicket from "@/pages/EditTicket";
import Clients from "@/pages/Clients";
import Workers from "@/pages/Workers";
import Archive from "@/pages/Archive";
import Templates from "@/pages/Templates";
import Billing from "@/pages/Billing";
import PendingInvites from "@/pages/PendingInvites";

// Admin pages
import AdminAgencies from "@/pages/admin/AdminAgencies";
import AdminTicketSearch from "@/pages/admin/AdminTicketSearch";
import AdminNotifications from "@/pages/admin/AdminNotifications";
import AdminRateLimits from "@/pages/admin/AdminRateLimits";

// Client pages
import ClientDashboard from "@/pages/client/ClientDashboard";
import ClientPending from "@/pages/client/ClientPending";
import ClientHistory from "@/pages/client/ClientHistory";
import ClientTicketSign from "@/pages/client/ClientTicketSign";
import ClientOnboarding from "@/pages/client/ClientOnboarding";
import ClientForgotPassword from "@/pages/auth/ClientForgotPassword";
import ClientResetPassword from "@/pages/auth/ClientResetPassword";

// Worker pages
import WorkerTickets from "@/pages/worker/WorkerTickets";
import WorkerHours from "@/pages/worker/WorkerHours";
import WorkerForgotPassword from "@/pages/auth/WorkerForgotPassword";
import WorkerResetPassword from "@/pages/auth/WorkerResetPassword";

import QAChecklist from "@/pages/QAChecklist";
import Help from "@/pages/Help";
import Security from "@/pages/Security";
import Handoff from "@/pages/admin/Handoff";
import Terms from "@/pages/legal/Terms";
import Privacy from "@/pages/legal/Privacy";
import Contact from "@/pages/legal/Contact";
import NotFound from "./pages/NotFound";
import Unsubscribe from "@/pages/Unsubscribe";
import OAuthConsent from "@/pages/OAuthConsent";
import TalentList from "@/pages/talent/TalentList";
import TalentPassport from "@/pages/talent/TalentPassport";
import OnboardingKanban from "@/pages/onboarding/OnboardingKanban";
import OnboardingOsLayout from "@/pages/onboarding-os/OnboardingOsLayout";
import OnboardingOsDashboard from "@/pages/onboarding-os/OnboardingOsDashboard";
import OnboardingReadiness from "@/pages/onboarding-os/OnboardingReadiness";
import ClientRequirementsPage from "@/pages/onboarding-os/ClientRequirementsPage";
import OnboardingAssistantPage from "@/pages/onboarding-os/OnboardingAssistantPage";
import TrainingCatalog from "@/pages/training/TrainingCatalog";
import CoursePlayer from "@/pages/training/CoursePlayer";
import JobBoard from "@/pages/jobs/JobBoard";
import JobDetail from "@/pages/jobs/JobDetail";
import BlindReview from "@/pages/talent/BlindReview";
import ScreeningList from "@/pages/screening/ScreeningList";
import Scheduling from "@/pages/scheduling/Scheduling";
import Timecards from "@/pages/timecards/Timecards";
import Reports from "@/pages/reports/Reports";
import AICenter from "@/pages/ai-center/AICenter";
import NetworkPage from "@/pages/network/Network";
import { ModulePlaceholder } from "@/components/ModulePlaceholder";
import WoicLayout from "@/pages/woic/WoicLayout";
import WoicCognitive from "@/pages/woic/WoicCognitive";

import WoicIdentity from "@/pages/woic/WoicIdentity";
import WoicKnowledge from "@/pages/woic/WoicKnowledge";
import WoicDecisions from "@/pages/woic/WoicDecisions";
import WoicRecommendations from "@/pages/woic/WoicRecommendations";
import WoicPredictions from "@/pages/woic/WoicPredictions";
import WoicLearning from "@/pages/woic/WoicLearning";
import WoicCompliance from "@/pages/woic/WoicCompliance";
import WoicContext from "@/pages/woic/WoicContext";
import WoicRegistry from "@/pages/woic/WoicRegistry";
import GraphLayout from "@/pages/graph/GraphLayout";
import GraphExplorer from "@/pages/graph/GraphExplorer";
import GraphIntelligence from "@/pages/graph/GraphIntelligence";
import GraphPaths from "@/pages/graph/GraphPaths";
import GraphTaxonomy from "@/pages/graph/GraphTaxonomy";
import RecruitLayout from "@/pages/recruit/RecruitLayout";
import RecruitDashboard from "@/pages/recruit/RecruitDashboard";
import RecruitCandidates from "@/pages/recruit/RecruitCandidates";
import RecruitMarketplace from "@/pages/recruit/RecruitMarketplace";
import RecruitJobs from "@/pages/recruit/RecruitJobs";
import RecruitClientsPage from "@/pages/recruit/RecruitClients";
import RecruitPipeline from "@/pages/recruit/RecruitPipeline";
import RecruitInterviews from "@/pages/recruit/RecruitInterviews";
import RecruitPlacements from "@/pages/recruit/RecruitPlacements";
import RecruitAnalytics from "@/pages/recruit/RecruitAnalytics";
import RecruitAssistant from "@/pages/recruit/RecruitAssistant";
import PassportLayout from "@/pages/passport/PassportLayout";
import PassportHome from "@/pages/passport/PassportHome";
import PassportRedirect from "@/pages/passport/PassportRedirect";
import PassportSettings from "@/pages/passport/PassportSettings";
import {
  PassportIdentity, PassportSkills, PassportCertifications, PassportTraining,
  PassportEmployment, PassportCompliancePage, PassportDocuments, PassportPortfolio,
  PassportTimeline, PassportCareerCoach, PassportOpportunities,
} from "@/pages/passport/PassportTabs";
import PassportVerifications from "@/pages/passport/PassportVerifications";
import PassportBadges from "@/pages/passport/PassportBadges";
import PassportSharing from "@/pages/passport/PassportSharing";
import TwinIndex from "@/pages/twin/TwinIndex";
import TwinLayout from "@/pages/twin/TwinLayout";
import TwinDashboard from "@/pages/twin/TwinDashboard";
import TwinCapabilities from "@/pages/twin/TwinCapabilities";
import TwinPredictions from "@/pages/twin/TwinPredictions";
import TwinCareerSim from "@/pages/twin/TwinCareerSim";
import TwinAssignmentSim from "@/pages/twin/TwinAssignmentSim";
import TwinCoaching from "@/pages/twin/TwinCoaching";
import TwinGrowth from "@/pages/twin/TwinGrowth";
import TwinTimeline from "@/pages/twin/TwinTimeline";
import TwinKnowledgeGraph from "@/pages/twin/TwinKnowledgeGraph";
import TwinOrganization from "@/pages/twin/TwinOrganization";
import TtoLayout from "@/pages/tto/TtoLayout";
import ClientWorkspaceLayout from "@/pages/cc/ClientWorkspaceLayout";
import CcCommandCenter from "@/pages/cc/CommandCenter";
import CcJobOrders from "@/pages/cc/JobOrderCenter";
import CcCandidates from "@/pages/cc/CandidateReview";
import CcApprovals from "@/pages/cc/ApprovalCenter";
import CcDocuments from "@/pages/cc/DocumentCenter";
import CcCommunication from "@/pages/cc/CommunicationCenter";
import CcRequests from "@/pages/cc/ServiceRequests";
import CcAnalytics from "@/pages/cc/ClientAnalytics";
import CcAdvisor from "@/pages/cc/ClientAdvisor";
import CcCalendar from "@/pages/cc/CcCalendar";
import CcNotifs from "@/pages/cc/NotificationsCenter";
import CcExecutive from "@/pages/cc/ExecutiveView";
import CcPermissions from "@/pages/cc/Permissions";
import CcApi from "@/pages/cc/ClientApiKeys";
import TimeTicketDashboard from "@/pages/tto/TimeTicketDashboard";
import WorkerTimeCenter from "@/pages/tto/WorkerTimeCenter";
import SupervisorApprovalCenter from "@/pages/tto/SupervisorApprovalCenter";
import CorrectionQueue from "@/pages/tto/CorrectionQueue";
import PayrollPrep from "@/pages/tto/PayrollPrep";
import BillingPrep from "@/pages/tto/BillingPrep";
import LiveLaborDashboard from "@/pages/tto/LiveLaborDashboard";
import LaborAnalytics from "@/pages/tto/LaborAnalytics";
import AuditCenter from "@/pages/tto/AuditCenter";
import AutomationLayout from "@/pages/automation/AutomationLayout";
import AutomationDashboard from "@/pages/automation/AutomationDashboard";
import RuleBuilder from "@/pages/automation/RuleBuilder";
import LiveMonitor from "@/pages/automation/LiveMonitor";
import TemplatesLibrary from "@/pages/automation/TemplatesLibrary";
import AgentActivity from "@/pages/automation/AgentActivity";
import AutomationLogs from "@/pages/automation/AutomationLogs";
import DeadLetterQueue from "@/pages/automation/DeadLetterQueue";
import AutomationAnalyticsPage from "@/pages/automation/AutomationAnalytics";
import WorkflowBuilder from "@/pages/automation/WorkflowBuilder";
import TriggersCatalog from "@/pages/automation/TriggersCatalog";
import ActionsCatalog from "@/pages/automation/ActionsCatalog";
import ConditionsCatalog from "@/pages/automation/ConditionsCatalog";
import ApprovalsCenter from "@/pages/automation/ApprovalsCenter";
import WorkflowTesting from "@/pages/automation/WorkflowTesting";
import AutomationSettings from "@/pages/automation/AutomationSettings";
// Operational Intelligence Center (IWOS 4.9)
import ActivityLayout from "@/pages/activity/ActivityLayout";
import ActivityLiveEvents from "@/pages/activity/LiveEvents";
import ActivityExplorer from "@/pages/activity/EventExplorer";
import ActivityTimeline from "@/pages/activity/EventTimeline";
import ActivityReplay from "@/pages/activity/EventReplay";
import ActivitySystemHealth from "@/pages/activity/SystemHealth";
import ActivityNotifications from "@/pages/activity/ActivityNotifications";
import ActivityAi from "@/pages/activity/AiActivity";
import { OrganizationActivity as ActivityOrgs, WorkerActivity as ActivityWorkers } from "@/pages/activity/SubjectActivity";
import ActivityAudit from "@/pages/activity/AuditHistory";
import TimelineLayout from "@/pages/timeline/TimelineLayout";
import TimelineWorkspace from "@/pages/timeline/TimelineWorkspace";
import TimelineSavedViews from "@/pages/timeline/TimelineSavedViews";
import TimelineSettingsPage from "@/pages/timeline/TimelineSettings";
import OicLayout from "@/pages/oic/OicLayout";
import MissionControl from "@/pages/oic/MissionControl";
import OrganizationHealthPage from "@/pages/oic/OrganizationHealthPage";
import LiveEventStreamPage from "@/pages/oic/LiveEventStreamPage";
import OicRiskCenter from "@/pages/oic/RiskCenter";
import OicExecutiveOverview from "@/pages/oic/ExecutiveOverview";

const queryClient = new QueryClient();

function LoginRedirect() {
  const { user, portalType, loading } = useAuth();
  if (loading) return null;
  if (!user) return <AgencyLogin />;
  if (portalType === "client") return <Navigate to="/client" replace />;
  if (portalType === "worker") return <Navigate to="/worker" replace />;
  return <Navigate to="/" replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public auth routes */}
            <Route path="/login" element={<LoginRedirect />} />
            <Route path="/client/login" element={<ClientLogin />} />
            <Route path="/worker/login" element={<WorkerLogin />} />
            <Route path="/register" element={<Register />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/client/onboarding/:token" element={<ClientOnboarding />} />
            <Route path="/forgot-password" element={<AgencyForgotPassword />} />
            <Route path="/reset-password" element={<AgencyResetPassword />} />
            <Route path="/client/forgot-password" element={<ClientForgotPassword />} />
            <Route path="/client/reset-password" element={<ClientResetPassword />} />
            <Route path="/worker/forgot-password" element={<WorkerForgotPassword />} />
            <Route path="/worker/reset-password" element={<WorkerResetPassword />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />

            {/* Public legal / info routes */}
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/contact" element={<Contact />} />

            {/* Agency portal */}
            <Route element={<ProtectedRoute allowedRoles={["super_admin", "agency_admin", "dispatcher", "payroll", "viewer"]} redirectTo="/login" />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/help" element={<Help />} />
                <Route path="/tickets" element={<Tickets />} />
                <Route path="/tickets/create" element={<CreateTicket />} />
                <Route path="/tickets/create/weekly" element={<CreateWeeklyTicket />} />
                <Route path="/tickets/:id" element={<TicketDetail />} />
                <Route path="/tickets/:id/edit" element={<EditTicket />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/workers" element={<Workers />} />
                <Route path="/archive" element={<Archive />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/invites" element={<PendingInvites />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/qa" element={<QAChecklist />} />
                <Route path="/security" element={<Security />} />
                {/* Workforce OS: live modules */}
                <Route path="/talent" element={<TalentList />} />
                <Route path="/talent/:id" element={<TalentPassport />} />
                {/* Workforce OS: disclosed placeholders */}
                <Route path="/jobs" element={<JobBoard />} />
                <Route path="/jobs/:id" element={<JobDetail />} />
                <Route path="/candidates" element={<BlindReview />} />
                <Route path="/screening" element={<ScreeningList />} />
                <Route path="/onboarding" element={<OnboardingKanban />} />
                <Route path="/compliance" element={<ModulePlaceholder moduleKey="compliance" />} />
                <Route path="/training" element={<TrainingCatalog />} />
                <Route path="/training/:id" element={<CoursePlayer />} />
                <Route path="/scheduling" element={<Scheduling />} />
                <Route path="/onboarding-os" element={<OnboardingOsLayout />}>
                  <Route index element={<OnboardingOsDashboard />} />
                  <Route path="tasks" element={<OnboardingKanban />} />
                  <Route path="readiness" element={<OnboardingReadiness />} />
                  <Route path="requirements" element={<ClientRequirementsPage />} />
                  <Route path="assistant" element={<OnboardingAssistantPage />} />
                </Route>
                <Route path="/timecards" element={<Timecards />} />
                <Route path="/payroll" element={<ModulePlaceholder moduleKey="payroll" />} />
                <Route path="/ai-center" element={<AICenter />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/network" element={<NetworkPage />} />
                <Route path="/settings" element={<ModulePlaceholder moduleKey="settings" />} />
                {/* Recruit OS operating profile */}
                <Route path="/recruit" element={<RecruitLayout />}>
                  <Route index element={<RecruitDashboard />} />
                  <Route path="candidates" element={<RecruitCandidates />} />
                  <Route path="marketplace" element={<RecruitMarketplace />} />
                  <Route path="jobs" element={<RecruitJobs />} />
                  <Route path="clients" element={<RecruitClientsPage />} />
                  <Route path="pipeline" element={<RecruitPipeline />} />
                  <Route path="interviews" element={<RecruitInterviews />} />
                  <Route path="placements" element={<RecruitPlacements />} />
                  <Route path="analytics" element={<RecruitAnalytics />} />
                  <Route path="assistant" element={<RecruitAssistant />} />
                </Route>
                {/* Digital Time Ticket OS (IWOS 4.5) */}
                <Route path="/tto" element={<TtoLayout />}>
                  <Route index element={<TimeTicketDashboard />} />
                  <Route path="live" element={<LiveLaborDashboard />} />
                  <Route path="approvals" element={<SupervisorApprovalCenter />} />
                  <Route path="corrections" element={<CorrectionQueue />} />
                  <Route path="payroll" element={<PayrollPrep />} />
                  <Route path="billing" element={<BillingPrep />} />
                  <Route path="analytics" element={<LaborAnalytics />} />
                  <Route path="audit" element={<AuditCenter />} />
                  <Route path="worker" element={<WorkerTimeCenter />} />
                </Route>
                {/* Automation Studio (IWOS 4.8) */}
                <Route path="/automation" element={<AutomationLayout />}>
                  <Route index element={<AutomationDashboard />} />
                  <Route path="builder" element={<RuleBuilder />} />
                  <Route path="monitor" element={<LiveMonitor />} />
                  <Route path="templates" element={<TemplatesLibrary />} />
                  <Route path="agents" element={<AgentActivity />} />
                  <Route path="logs" element={<AutomationLogs />} />
                  <Route path="dead-letter" element={<DeadLetterQueue />} />
                  <Route path="analytics" element={<AutomationAnalyticsPage />} />
                  <Route path="workflow" element={<WorkflowBuilder />} />
                  <Route path="triggers" element={<TriggersCatalog />} />
                  <Route path="actions" element={<ActionsCatalog />} />
                  <Route path="conditions" element={<ConditionsCatalog />} />
                  <Route path="approvals" element={<ApprovalsCenter />} />
                  <Route path="testing" element={<WorkflowTesting />} />
                  <Route path="settings" element={<AutomationSettings />} />
                </Route>
                {/* System Activity Center — Universal Event Fabric (IWOS 5.1B) */}
                <Route path="/activity" element={<ActivityLayout />}>
                  <Route index element={<ActivityLiveEvents />} />
                  <Route path="explorer" element={<ActivityExplorer />} />
                  <Route path="timeline" element={<ActivityTimeline />} />
                  <Route path="replay" element={<ActivityReplay />} />
                  <Route path="health" element={<ActivitySystemHealth />} />
                  <Route path="notifications" element={<ActivityNotifications />} />
                  <Route path="ai" element={<ActivityAi />} />
                  <Route path="organizations" element={<ActivityOrgs />} />
                  <Route path="workers" element={<ActivityWorkers />} />
                  <Route path="audit" element={<ActivityAudit />} />
                </Route>
                {/* Universal Timeline Workspace (IWOS 5.4B) */}
                <Route path="/timeline" element={<TimelineLayout />}>
                  <Route index element={<TimelineWorkspace scopeKey="global" />} />
                  <Route path="worker" element={<TimelineWorkspace scopeKey="worker" />} />
                  <Route path="organization" element={<TimelineWorkspace scopeKey="organization" />} />
                  <Route path="project" element={<TimelineWorkspace scopeKey="project" />} />
                  <Route path="assignment" element={<TimelineWorkspace scopeKey="assignment" />} />
                  <Route path="recruiting" element={<TimelineWorkspace scopeKey="recruiting" />} />
                  <Route path="compliance" element={<TimelineWorkspace scopeKey="compliance" />} />
                  <Route path="payroll" element={<TimelineWorkspace scopeKey="payroll" />} />
                  <Route path="communication" element={<TimelineWorkspace scopeKey="communication" />} />
                  <Route path="ai" element={<TimelineWorkspace scopeKey="ai" />} />
                  <Route path="automation" element={<TimelineWorkspace scopeKey="automation" />} />
                  <Route path="twin" element={<TimelineWorkspace scopeKey="twin" />} />
                  <Route path="explorer" element={<ActivityExplorer />} />
                  <Route path="views" element={<TimelineSavedViews />} />
                  <Route path="settings" element={<TimelineSettingsPage />} />
                </Route>
                {/* Knowledge Workspace (IWOS 5.5B) */}
                <Route path="/knowledge" element={<KnowledgeLayout />}>
                  <Route index element={<KnowledgeHome />} />
                  <Route path="search" element={<KnowledgeSearchPage />} />
                  <Route path="base" element={<KnowledgeBase />} />
                  <Route path="policies" element={<KnowledgePolicies />} />
                  <Route path="sops" element={<KnowledgeSops />} />
                  <Route path="regulations" element={<KnowledgeRegulations />} />
                  <Route path="training" element={<KnowledgeTraining />} />
                  <Route path="certifications" element={<KnowledgeCertifications />} />
                  <Route path="documents" element={<KnowledgeDocuments />} />
                  <Route path="insights" element={<KnowledgeInsights />} />
                  <Route path="graph" element={<KnowledgeGraphPage />} />
                  <Route path="collections" element={<KnowledgeCollections />} />
                  <Route path="approvals" element={<KnowledgeApprovals />} />
                  <Route path="analytics" element={<KnowledgeAnalyticsPage />} />
                  <Route path="settings" element={<KnowledgeSettingsPage />} />
                </Route>
                {/* Operational Intelligence Center (IWOS 4.9) */}
                <Route path="/oic" element={<OicLayout />}>
                  <Route index element={<MissionControl />} />
                  <Route path="health" element={<OrganizationHealthPage />} />
                  <Route path="stream" element={<LiveEventStreamPage />} />
                  <Route path="risk" element={<OicRiskCenter />} />
                  <Route path="executive" element={<OicExecutiveOverview />} />
                </Route>
                {/* Client Collaboration Workspace (IWOS 4.7) */}
                <Route path="/cc/:clientId" element={<ClientWorkspaceLayout />}>
                  <Route index element={<CcCommandCenter />} />
                  <Route path="orders" element={<CcJobOrders />} />
                  <Route path="candidates" element={<CcCandidates />} />
                  <Route path="approvals" element={<CcApprovals />} />
                  <Route path="documents" element={<CcDocuments />} />
                  <Route path="communication" element={<CcCommunication />} />
                  <Route path="requests" element={<CcRequests />} />
                  <Route path="analytics" element={<CcAnalytics />} />
                  <Route path="advisor" element={<CcAdvisor />} />
                  <Route path="calendar" element={<CcCalendar />} />
                  <Route path="notifications" element={<CcNotifs />} />
                  <Route path="executive" element={<CcExecutive />} />
                  <Route path="permissions" element={<CcPermissions />} />
                  <Route path="api" element={<CcApi />} />
                </Route>
                {/* Digital Worker Twin (IWOS 4.4) */}
                <Route path="/twin" element={<TwinIndex />} />
                <Route path="/twin/:workerId" element={<TwinLayout />}>
                  <Route index element={<TwinDashboard />} />
                  <Route path="capabilities" element={<TwinCapabilities />} />
                  <Route path="predictions" element={<TwinPredictions />} />
                  <Route path="career" element={<TwinCareerSim />} />
                  <Route path="assignments" element={<TwinAssignmentSim />} />
                  <Route path="coaching" element={<TwinCoaching />} />
                  <Route path="growth" element={<TwinGrowth />} />
                  <Route path="timeline" element={<TwinTimeline />} />
                  <Route path="knowledge" element={<TwinKnowledgeGraph />} />
                  <Route path="organization" element={<TwinOrganization />} />
                </Route>
                {/* Workforce Passport (IWOS Build 4.1) */}
                <Route path="/passport" element={<PassportRedirect />} />
                <Route path="/passport/:passportId" element={<PassportLayout />}>
                  <Route index element={<PassportHome />} />
                  <Route path="identity" element={<PassportIdentity />} />
                  <Route path="verifications" element={<PassportVerifications />} />
                  <Route path="badges" element={<PassportBadges />} />
                  <Route path="sharing" element={<PassportSharing />} />
                  <Route path="skills" element={<PassportSkills />} />
                  <Route path="certifications" element={<PassportCertifications />} />
                  <Route path="training" element={<PassportTraining />} />
                  <Route path="employment" element={<PassportEmployment />} />
                  <Route path="compliance" element={<PassportCompliancePage />} />
                  <Route path="documents" element={<PassportDocuments />} />
                  <Route path="portfolio" element={<PassportPortfolio />} />
                  <Route path="timeline" element={<PassportTimeline />} />
                  <Route path="coach" element={<PassportCareerCoach />} />
                  <Route path="opportunities" element={<PassportOpportunities />} />
                  <Route path="settings" element={<PassportSettings />} />
                </Route>
              </Route>
            </Route>

            {/* WOIC Administration Center — super_admin only */}
            <Route element={<ProtectedRoute allowedRoles={["super_admin"]} redirectTo="/unauthorized" />}>
              <Route element={<AppLayout />}>
                <Route path="/woic" element={<WoicLayout />}>
                  <Route index element={<WoicCognitive />} />
                  <Route path="cognitive" element={<WoicCognitive />} />
                  <Route path="identity" element={<WoicIdentity />} />

                  <Route path="knowledge" element={<WoicKnowledge />} />
                  <Route path="decisions" element={<WoicDecisions />} />
                  <Route path="recommendations" element={<WoicRecommendations />} />
                  <Route path="predictions" element={<WoicPredictions />} />
                  <Route path="learning" element={<WoicLearning />} />
                  <Route path="compliance" element={<WoicCompliance />} />
                  <Route path="context" element={<WoicContext />} />
                  <Route path="registry" element={<WoicRegistry />} />
                </Route>
              </Route>
            </Route>

            {/* IWOS Global Workforce Graph */}
            <Route element={<ProtectedRoute allowedRoles={["agency_admin", "super_admin"]} redirectTo="/unauthorized" />}>
              <Route element={<AppLayout />}>
                <Route path="/graph" element={<GraphLayout />}>
                  <Route index element={<GraphExplorer />} />
                  <Route path="explorer" element={<GraphExplorer />} />
                  <Route path="intelligence" element={<GraphIntelligence />} />
                  <Route path="paths" element={<GraphPaths />} />
                  <Route path="taxonomy" element={<GraphTaxonomy />} />
                </Route>
              </Route>
            </Route>


            {/* Admin-only routes (super_admin only) */}
            <Route element={<ProtectedRoute allowedRoles={["super_admin"]} redirectTo="/unauthorized" />}>
              <Route element={<AppLayout />}>
                <Route path="/admin/agencies" element={<AdminAgencies />} />
                <Route path="/admin/tickets" element={<AdminTicketSearch />} />
                <Route path="/admin/notifications" element={<AdminNotifications />} />
                <Route path="/admin/rate-limits" element={<AdminRateLimits />} />
                <Route path="/handoff" element={<Handoff />} />
              </Route>
            </Route>

            {/* Client portal */}
            <Route element={<ProtectedRoute allowedRoles={["client_user"]} redirectTo="/client/login" />}>
              <Route element={<ClientLayout />}>
                <Route path="/client" element={<ClientDashboard />} />
                <Route path="/client/pending" element={<ClientPending />} />
                <Route path="/client/ticket/:id" element={<ClientTicketSign />} />
                <Route path="/client/history" element={<ClientHistory />} />
              </Route>
            </Route>

            {/* Worker portal */}
            <Route element={<ProtectedRoute allowedRoles={["worker_user"]} redirectTo="/worker/login" />}>
              <Route element={<WorkerLayout />}>
                <Route path="/worker" element={<WorkerTickets />} />
                <Route path="/worker/hours" element={<WorkerHours />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
