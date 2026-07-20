import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { jsonResponse, requireUser } from "../_shared/auth.ts";
import { withSentry } from "../_shared/sentry.ts";

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  const { question, context } = await req.json().catch(() => ({}));
  if (!question || typeof question !== "string") {
    return jsonResponse({ error: "question required", code: "bad_request" }, 400, corsHeaders);
  }

  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return jsonResponse({ error: "AI unavailable", code: "config" }, 503, corsHeaders);

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You are the Temp Tic onboarding assistant. Help workers finish onboarding: identity, I-9, W-4, background check, drug screen, training, signatures. Be brief, practical, and cite the next concrete action. Never invent legal advice.",
        },
        {
          role: "user",
          content: `Context: ${JSON.stringify(context ?? {})}\n\nQuestion: ${question}`,
        },
      ],
    }),
  });

  if (res.status === 429) return jsonResponse({ error: "rate limited", code: "rate_limited" }, 429, corsHeaders);
  if (res.status === 402) return jsonResponse({ error: "credits exhausted", code: "credits" }, 402, corsHeaders);
  if (!res.ok) return jsonResponse({ error: "ai error", code: "ai_error" }, 502, corsHeaders);

  const json = await res.json();
  const answer = json?.choices?.[0]?.message?.content ?? "";
  return jsonResponse({ answer }, 200, corsHeaders);
}

Deno.serve(withSentry("onboarding-assistant", handler));
