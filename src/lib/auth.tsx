import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type AppRole = "super_admin" | "agency_admin" | "dispatcher" | "payroll" | "viewer" | "client_user" | "worker_user";

export interface AuthState {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  agencyId: string | null;
  loading: boolean;
  portalType: "agency" | "client" | "worker" | null;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, meta?: Record<string, string>) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isAgency: boolean;
  isClient: boolean;
  isWorker: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

async function fetchRoles(userId: string): Promise<AppRole[]> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  return (data ?? []).map((r: { role: AppRole }) => r.role);
}

async function fetchAgencyId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("agency_members")
    .select("agency_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1)
    .single();
  return data?.agency_id ?? null;
}

function derivePortal(roles: AppRole[]): AuthState["portalType"] {
  if (roles.some(r => ["super_admin", "agency_admin", "dispatcher", "payroll", "viewer"].includes(r))) return "agency";
  if (roles.includes("client_user")) return "client";
  if (roles.includes("worker_user")) return "worker";
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    roles: [],
    agencyId: null,
    loading: true,
    portalType: null,
  });

  const loadUserData = useCallback(async (user: User | null, session: Session | null) => {
    if (!user) {
      setState({ user: null, session: null, roles: [], agencyId: null, loading: false, portalType: null });
      return;
    }
    const [roles, agencyId] = await Promise.all([fetchRoles(user.id), fetchAgencyId(user.id)]);
    setState({
      user,
      session,
      roles,
      agencyId,
      loading: false,
      portalType: derivePortal(roles),
    });
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUserData(session?.user ?? null, session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      loadUserData(session?.user ?? null, session);
    });

    return () => subscription.unsubscribe();
  }, [loadUserData]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, meta?: Record<string, string>) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: meta, emailRedirectTo: window.location.origin },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isAgency = state.portalType === "agency";
  const isClient = state.portalType === "client";
  const isWorker = state.portalType === "worker";

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut, isAgency, isClient, isWorker }}>
      {children}
    </AuthContext.Provider>
  );
}
