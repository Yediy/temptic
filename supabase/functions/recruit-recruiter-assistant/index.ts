// recruit-recruiter-assistant — AI recruiter assistant via Lovable AI Gateway.
// Provides summaries, drafts, and next-action suggestions. Never bypasses RLS.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { withSentry } from "../_shared/sentry.ts";
import { jsonResponse, requireUser } from "../_shared/auth.ts";
import { isUuid, requireAgencyMember } from "../_shared/woic.ts";

const LOVABLE_API = "https://ai.gateway.lovable.dev/v1/chat/completions";

Deno.serve(withSentry("recruit-recruiter-assistant", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);

  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return jsonResponse({ error: "ai_unavailable", code: "ai_unavailable" }, 503, corsHeaders);

  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  const body = await req.json().catch(() => null) as {
    agency_id?: string;
    task?: "summarize_candidate" | "draft_message" | "next_actions" | "chat";
    context?: Record<string, unknown>;
    messages?: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  } | null;
  if (!body || !isUuid(body.agency_id) || !body.task) {
    return jsonResponse({ error: "agency_id and task required", code: "bad_request" }, 400, corsHeaders);
  }
  const forbidden = await requireAgencyMember(auth.userClient, body.agency_id!, corsHeaders);
  if (forbidden) return forbidden;

  const system = "You are an AI recruiting assistant for a staffing agency. Be concise, cite facts from provided context, never invent qualifications, and never use protected demographic data (race, religion, age, gender, national origin) in ranking or recommendations.";
  const messages = body.messages ?? [
    { role: "system" as const, content: system },
    { role: "user" as const, content: `Task: ${body.task}\nContext: ${JSON.stringify(body.context ?? {})}` },
  ];

  const res = await fetch(LOVABLE_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    return jsonResponse({ error: "ai_error", detail: txt.slice(0, 500), status: res.status }, 502, corsHeaders);
  }
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content ?? "";
  return jsonResponse({ data: { content, model: json?.model } }, 200, corsHeaders);
}));
