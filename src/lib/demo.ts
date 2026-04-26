/**
 * Demo mode helpers.
 *
 * The demo agency is identified by `agencies.is_demo = true`. Any user linked
 * to that agency is operating inside the read-only sandbox and cannot perform
 * sensitive mutations (billing, real sends, deletes, destructive edits).
 *
 * For UI-only enforcement we expose `useIsDemo()` (queries the user's agency)
 * and `simulateDemoAction()` to wrap blocked actions with a friendly toast.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

const DEMO_TOAST_MESSAGE = "Demo Environment: Action simulated.";

export function useIsDemo(): { isDemo: boolean; loading: boolean } {
  const { agencyId, user } = useAuth();
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user || !agencyId) {
      setIsDemo(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("agencies")
      .select("is_demo")
      .eq("id", agencyId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setIsDemo(Boolean(data?.is_demo));
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [agencyId, user]);

  return { isDemo, loading };
}

/**
 * Show the standard demo toast. Use as a fallback before performing any
 * destructive action so demo users see consistent messaging.
 */
export function notifyDemoBlocked() {
  toast({
    title: "Demo Mode",
    description: DEMO_TOAST_MESSAGE,
  });
}

/**
 * Wrap a callback so it becomes a no-op (with toast) when in demo mode.
 */
export function withDemoGuard<TArgs extends unknown[]>(
  isDemo: boolean,
  fn: (...args: TArgs) => void | Promise<void>,
) {
  return async (...args: TArgs) => {
    if (isDemo) {
      notifyDemoBlocked();
      return;
    }
    await fn(...args);
  };
}

export const DEMO_BANNER_TEXT =
  "You're exploring the Temp Tic demo. Sample data only — destructive actions are simulated.";
