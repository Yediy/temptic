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

// Admin pages
import AdminAgencies from "@/pages/admin/AdminAgencies";
import AdminTicketSearch from "@/pages/admin/AdminTicketSearch";
import AdminNotifications from "@/pages/admin/AdminNotifications";

// Client pages
import ClientDashboard from "@/pages/client/ClientDashboard";
import ClientPending from "@/pages/client/ClientPending";
import ClientHistory from "@/pages/client/ClientHistory";
import ClientTicketSign from "@/pages/client/ClientTicketSign";
import ClientOnboarding from "@/pages/client/ClientOnboarding";

// Worker pages
import WorkerTickets from "@/pages/worker/WorkerTickets";
import WorkerHours from "@/pages/worker/WorkerHours";

import NotFound from "./pages/NotFound";
import Unsubscribe from "@/pages/Unsubscribe";

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

            {/* Agency portal */}
            <Route element={<ProtectedRoute allowedRoles={["super_admin", "agency_admin", "dispatcher", "payroll", "viewer"]} redirectTo="/login" />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/tickets" element={<Tickets />} />
                <Route path="/tickets/create" element={<CreateTicket />} />
                <Route path="/tickets/create/weekly" element={<CreateWeeklyTicket />} />
                <Route path="/tickets/:id" element={<TicketDetail />} />
                <Route path="/tickets/:id/edit" element={<EditTicket />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/workers" element={<Workers />} />
                <Route path="/archive" element={<Archive />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/billing" element={<Billing />} />
              </Route>
            </Route>

            {/* Admin-only routes (super_admin only) */}
            <Route element={<ProtectedRoute allowedRoles={["super_admin"]} redirectTo="/unauthorized" />}>
              <Route element={<AppLayout />}>
                <Route path="/admin/agencies" element={<AdminAgencies />} />
                <Route path="/admin/tickets" element={<AdminTicketSearch />} />
                <Route path="/admin/notifications" element={<AdminNotifications />} />
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
