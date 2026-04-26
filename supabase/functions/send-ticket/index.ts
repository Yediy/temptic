import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Distributed rate limiter (Postgres-backed, persists across instances/cold starts)
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX = 30;

// ---------- Reliable client-IP extraction ----------
const PRIVATE_IP_RE =
  /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc[0-9a-f]{2}:|fd[0-9a-f]{2}:|fe80:)/i;
const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPV6_RE = /^[0-9a-f:]+$/i;

function isValidPublicIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const ip = raw.trim().replace(/^\[|\]$/g, "");
  if (!ip) return null;
  if (!IPV4_RE.test(ip) && !IPV6_RE.test(ip)) return null;
  if (PRIVATE_IP_RE.test(ip)) return null;
  return ip;
}

function jwtSubUnverified(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    return typeof payload?.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface ClientIdentity {
  ip: string | null;
  rateKey: string;
  source: "cf" | "true-client" | "fly" | "x-real-ip" | "xff" | "user" | "ua-hash";
}

async function resolveClientIdentity(
  req: Request,
  endpoint: string,
): Promise<ClientIdentity> {
  const headers = req.headers;
  const cf = isValidPublicIp(headers.get("cf-connecting-ip"));
  if (cf) return { ip: cf, rateKey: `${endpoint}:ip:${cf}`, source: "cf" };
  const trueClient = isValidPublicIp(headers.get("true-client-ip"));
  if (trueClient)
    return { ip: trueClient, rateKey: `${endpoint}:ip:${trueClient}`, source: "true-client" };
  const fly = isValidPublicIp(headers.get("fly-client-ip"));
  if (fly) return { ip: fly, rateKey: `${endpoint}:ip:${fly}`, source: "fly" };
  const xReal = isValidPublicIp(headers.get("x-real-ip"));
  if (xReal) return { ip: xReal, rateKey: `${endpoint}:ip:${xReal}`, source: "x-real-ip" };
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    for (const candidate of xff.split(",")) {
      const ip = isValidPublicIp(candidate);
      if (ip) return { ip, rateKey: `${endpoint}:ip:${ip}`, source: "xff" };
    }
  }
  const sub = jwtSubUnverified(headers.get("Authorization"));
  if (sub) return { ip: null, rateKey: `${endpoint}:user:${sub}`, source: "user" };
  const fingerprint = `${headers.get("user-agent") ?? ""}|${headers.get("accept-language") ?? ""}`;
  const hash = (await sha256Hex(fingerprint)).slice(0, 16);
  return { ip: null, rateKey: `${endpoint}:ua:${hash}`, source: "ua-hash" };
}

async function isRateLimited(
  supabase: ReturnType<typeof createClient>,
  key: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("check_rate_limit", {
      _key: key,
      _max_requests: RATE_LIMIT_MAX,
      _window_seconds: RATE_LIMIT_WINDOW_SECONDS,
    });
    if (error) {
      console.error("Rate limit check failed (fail-open):", error);
      return false;
    }
    return data === true;
  } catch (e) {
    console.error("Rate limit check threw (fail-open):", e);
    return false;
  }
}

async function logRateLimitEvent(
  supabase: ReturnType<typeof createClient>,
  payload: {
    endpoint: string;
    rate_key: string;
    ip_address: string | null;
    user_id?: string | null;
    user_role?: string | null;
  },
): Promise<void> {
  try {
    await supabase.from("rate_limit_events").insert({
      endpoint: payload.endpoint,
      rate_key: payload.rate_key,
      ip_address: payload.ip_address,
      user_id: payload.user_id ?? null,
      user_role: payload.user_role ?? null,
    });
  } catch (e) {
    console.error("Failed to log rate limit event:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";
    const rateKey = `send-ticket:${clientIp}`;
    if (await isRateLimited(supabase, rateKey)) {
      await logRateLimitEvent(supabase, {
        endpoint: "send-ticket",
        rate_key: rateKey,
        ip_address: clientIp,
        user_role: "agency",
      });
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth header");

    const userClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();

    if (userErr || !user) throw new Error("Unauthorized");

    const { ticket_id } = await req.json();

    if (!ticket_id || typeof ticket_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticket_id)) {
      throw new Error("Invalid ticket_id");
    }

    const { data: membership } = await supabase
      .from("agency_members")
      .select("agency_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (!membership?.agency_id) throw new Error("No agency membership");

    const { data: ticket, error: ticketErr } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", ticket_id)
      .eq("agency_id", membership.agency_id)
      .single();

    if (ticketErr || !ticket) throw new Error("Ticket not found");

    if (!["draft", "corrected"].includes(ticket.status)) {
      throw new Error(`Ticket cannot be sent from "${ticket.status}" status. Only draft or corrected tickets can be sent.`);
    }

    const { data: updated, error: updateErr } = await supabase
      .from("tickets")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticket_id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Send notification email to client signer (server-side only)
    try {
      const fnUrl = `${supabaseUrl}/functions/v1/send-notification-email`;
      await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": serviceKey,
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")!}`,
        },
        body: JSON.stringify({
          ticket_id: ticket.id,
          recipient_type: "client",
          template_key: "ticket_sent_client",
        }),
      });
    } catch (_) {
      // Notification failure should not block the send
    }

    return new Response(JSON.stringify({ ticket: updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
