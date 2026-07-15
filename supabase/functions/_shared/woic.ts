// Shared helpers for WOIC edge functions.
// - resolveAgency: verifies caller is a member of `agency_id` and returns
//   a service-role admin client for RLS-safe cross-table writes.
// - lovableAi: minimal wrapper around the Lovable AI Gateway for text output.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { jsonResponse } from "./auth.ts";

export function admin(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/**
 * Verifies that `userId` is an active member of `agencyId`. Returns null on
 * success, or a JSON 403 Response on failure.
 */
export async function requireAgencyMember(
  userClient: SupabaseClient,
  agencyId: string,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  const { data, error } = await userClient
    .from("agency_members")
    .select("agency_id")
    .eq("agency_id", agencyId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (error || !data) {
    return jsonResponse(
      { error: "You do not have access to this agency.", code: "forbidden" },
      403,
      corsHeaders,
    );
  }
  return null;
}

export function isUuid(v: unknown): v is string {
  return typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export async function lovableAiText(
  system: string,
  user: string,
  model = "google/gemini-2.5-flash",
): Promise<string | null> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return null;
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "edge-function-fetch",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null) as {
    choices?: Array<{ message?: { content?: string } }>;
  } | null;
  return json?.choices?.[0]?.message?.content ?? null;
}
