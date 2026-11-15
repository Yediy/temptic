import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, type AppRole } from "@/lib/auth";

interface Props {
  allowedRoles?: AppRole[];
  redirectTo?: string;
}

export function ProtectedRoute({ allowedRoles, redirectTo = "/login" }: Props) {
  const { user, roles, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  // TEMPORARY route-debug logging — remove after diagnosing /memory navigation.
  if (!user) {
    console.warn(`[route-debug] GUARD: no user -> redirecting ${location.pathname} to ${redirectTo}`);
    return <Navigate to={redirectTo} replace />;
  }

  if (allowedRoles && !allowedRoles.some(r => roles.includes(r))) {
    console.warn(
      `[route-debug] GUARD: role deny on ${location.pathname} — user roles [${roles.join(", ") || "none"}] ` +
      `do not include any of [${allowedRoles.join(", ")}] -> /unauthorized`
    );
    return <Navigate to="/unauthorized" replace />;
  }

  console.info(`[route-debug] GUARD: allowed ${location.pathname} (roles: [${roles.join(", ")}])`);
  return <Outlet />;
}
