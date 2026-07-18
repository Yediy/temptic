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
import WoicIdentity from "@/pages/woic/WoicIdentity";
import WoicKnowledge from "@/pages/woic/WoicKnowledge";
import WoicDecisions from "@/pages/woic/WoicDecisions";
import WoicRecommendations from "@/pages/woic/WoicRecommendations";
import WoicPredictions from "@/pages/woic/WoicPredictions";
import WoicLearning from "@/pages/woic/WoicLearning";
import WoicCompliance from "@/pages/woic/WoicCompliance";
import WoicContext from "@/pages/woic/WoicContext";
import WoicRegistry from "@/pages/woic/WoicRegistry";
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
              </Route>
            </Route>

            {/* WOIC Administration Center — super_admin only */}
            <Route element={<ProtectedRoute allowedRoles={["super_admin"]} redirectTo="/unauthorized" />}>
              <Route element={<AppLayout />}>
                <Route path="/woic" element={<WoicLayout />}>
                  <Route index element={<WoicIdentity />} />
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
