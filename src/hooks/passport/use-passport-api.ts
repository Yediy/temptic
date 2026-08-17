import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Universal Passport API client — the only supported way for IWOS operating
 * profiles to read verified passport data. All permission checks happen
 * server-side in the `passport-api` edge function.
 */
export const PASSPORT_SCOPES = [
  "identity",
  "verifications",
  "compliance",
  "credentials",
  "skills",
  "training",
  "badges",
  "reputation",
  "portfolio",
  "availability",
  "work_history",
] as const;

export type PassportScope = (typeof PASSPORT_SCOPES)[number];

export type PassportApiResponse = {
  version: string;
  passport_id: string;
  consumer: string;
  access: {
    via: "owner" | "agency" | "share_token" | "super_admin";
    permission_id: string | null;
    expires_at: string | null;
    granted_scopes: PassportScope[];
    returned_scopes: PassportScope[];
  };
  verified_only: true;
  generated_at: string;
  data: Record<string, unknown>;
};

export type PassportApiRequest = {
  passportId: string;
  scopes?: PassportScope[];
  /** Identifier of the consuming operating profile, e.g. "recruit-os". */
  consumer: string;
  shareToken?: string;
};

async function callPassportApi(req: PassportApiRequest): Promise<PassportApiResponse> {
  const { data, error } = await supabase.functions.invoke("passport-api", {
    body: {
      action: "read",
      passport_id: req.passportId,
      scopes: req.scopes,
      consumer: req.consumer,
      share_token: req.shareToken,
    },
  });
  if (error) throw error;
  return data as PassportApiResponse;
}

/** Reads verified passport data for a consuming operating profile. */
export function usePassportApi(req: Partial<PassportApiRequest> & { consumer: string }, enabled = true) {
  return useQuery({
    queryKey: ["passport-api", req.passportId, req.consumer, req.scopes?.join(",") ?? "all"],
    enabled: enabled && !!req.passportId,
    queryFn: () => callPassportApi(req as PassportApiRequest),
    retry: false,
  });
}

/** Imperative variant for one-off fetches (e.g. share-token lookups). */
export function useFetchPassportData() {
  return useMutation({ mutationFn: callPassportApi });
}

/** Self-describing scope catalog for consumers and permission UIs. */
export function usePassportApiSchema() {
  return useQuery({
    queryKey: ["passport-api-schema"],
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("passport-api", { body: { action: "describe" } });
      if (error) throw error;
      return data as { version: string; scopes: { scope: PassportScope; description: string }[] };
    },
  });
}
