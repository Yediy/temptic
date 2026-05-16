import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

/**
 * Client-side route guard for ticket actions and other sensitive mutations.
 *
 * Server-side auth is already enforced by every edge function (see
 * `supabase/functions/_shared/auth.ts`). This guard adds a UI-side
 * preflight + post-flight check so users without a valid session never
 * reach an action call, and are redirected to the right login page if
 * their session expired mid-use.
 *
 *   const guard = useAuthGuardedAction();
 *   await guard(async () => signTicket.mutateAsync(payload));
 */
export function useAuthGuardedAction() {
  const navigate = useNavigate();
  const { portalType } = useAuth();

  const loginPath =
    portalType === "client" ? "/client/login"
      : portalType === "worker" ? "/worker/login"
        : "/login";

  const redirectToLogin = useCallback((reason: string) => {
    toast({
      title: "Session expired",
      description: reason,
      variant: "destructive",
    });
    navigate(loginPath, { replace: true });
  }, [navigate, loginPath]);

  return useCallback(async <T,>(action: () => Promise<T>): Promise<T> => {
    // Preflight: verify a live, non-expired session exists before invoking
    // any ticket action. Avoids hitting the edge function at all when the
    // user is signed out or their refresh token failed.
    const { data, error } = await supabase.auth.getSession();
    const session = data?.session;
    if (error || !session || !session.access_token) {
      redirectToLogin("Please sign in again to continue.");
      throw new Error("unauthenticated");
    }
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    if (expiresAt && expiresAt < Date.now()) {
      await supabase.auth.signOut();
      redirectToLogin("Your session has expired. Please sign in again.");
      throw new Error("unauthenticated");
    }

    try {
      return await action();
    } catch (err) {
      // Post-flight: if the edge function returned 401, surface that as a
      // hard redirect to login rather than a generic error toast.
      const status = (err as { context?: { status?: number } })?.context?.status;
      const message = (err as Error)?.message ?? "";
      if (status === 401 || /unauthenticated|invalid_token/i.test(message)) {
        await supabase.auth.signOut();
        redirectToLogin("Your session is no longer valid. Please sign in.");
      }
      throw err;
    }
  }, [redirectToLogin]);
}
