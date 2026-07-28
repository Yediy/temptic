import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { withSentry } from "../_shared/sentry.ts";
import { jsonResponse, requireUser } from "../_shared/auth.ts";

Deno.serve(withSentry("cc-summarize-thread", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  const { thread_id } = (await req.json().catch(() => ({}))) as { thread_id?: string };
  if (!thread_id) return jsonResponse({ error: "thread_id required", code: "bad_request" }, 400, corsHeaders);

  const { data: msgs, error } = await auth.userClient
    .from("cc_messages")
    .select("sender_kind, body, created_at")
    .eq("thread_id", thread_id)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) return jsonResponse({ error: error.message, code: "internal" }, 500, corsHeaders);

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  const transcript = (msgs ?? []).map((m) => `${m.sender_kind}: ${m.body}`).join("\n");
  if (!apiKey || !transcript) {
    return jsonResponse({ data: { summary: transcript ? "AI summary unavailable." : "No messages yet." } }, 200, corsHeaders);
  }

  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Summarize this client/agency conversation in <=6 bullet points. Highlight decisions, open questions, and required follow-ups." },
        { role: "user", content: transcript.slice(0, 12000) },
      ],
    }),
  });
  if (!r.ok) return jsonResponse({ data: { summary: "Summary temporarily unavailable." } }, 200, corsHeaders);
  const j = await r.json();
  const summary = j?.choices?.[0]?.message?.content ?? "";
  return jsonResponse({ data: { summary } }, 200, corsHeaders);
}));
