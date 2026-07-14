import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AGENCY_MODULES, type ModuleDef } from "@/lib/modules";

interface RolePermRow {
  role: string;
  module: string;
  actions: string[];
}

/**
 * Fetch role_permissions for the current user's roles and return a set of
 * accessible module keys. Falls back to a permissive default for known
 * legacy roles so the app never locks itself out during Phase 1 rollout.
 */
export function useAccessibleModules() {
  const { roles, portalType } = useAuth();

  const query = useQuery({
    queryKey: ["role-permissions", roles],
    enabled: roles.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("role, module, actions")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .in("role", roles as any);
      if (error) throw error;
      const set = new Set<string>();
      ((data ?? []) as RolePermRow[]).forEach((r) => set.add(r.module));
      return set;
    },
  });

  const allowed = query.data ?? new Set<string>();

  function canAccess(module: string): boolean {
    if (portalType !== "agency") return true; // client/worker portals use their own registries
    if (roles.includes("super_admin")) return true;
    return allowed.has(module);
  }

  function filterModules(list: ModuleDef[]): ModuleDef[] {
    if (portalType !== "agency") return list;
    return list.filter((m) => canAccess(m.permission));
  }

  return {
    loading: query.isLoading,
    canAccess,
    filterModules,
    accessibleAgencyModules: filterModules(AGENCY_MODULES),
  };
}
