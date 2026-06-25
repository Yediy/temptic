import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { unauthorizedResponse } from "../_shared/auth.ts";
import { withSentry } from "../_shared/sentry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Distributed rate limiter (Postgres-backed)
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX = 10;

// ---------- Reliable client-IP extraction ----------
// Honors common CDN/proxy headers in priority order, validates the value,
// and skips private/loopback hops in x-forwarded-for chains.
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

// Decode JWT `sub` claim WITHOUT verifying the signature.
// Used only as a stable fallback rate-limit key, never for authorization.
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
  ip: string | null; // best-effort public IP, or null
  rateKey: string; // stable identifier for rate-limit bucketing
  source: "cf" | "true-client" | "fly" | "x-real-ip" | "xff" | "user" | "user+ip" | "ua-hash";
}

async function resolveClientIp(req: Request): Promise<{ ip: string | null; source: ClientIdentity["source"] | null }> {
  const headers = req.headers;
  const cf = isValidPublicIp(headers.get("cf-connecting-ip"));
  if (cf) return { ip: cf, source: "cf" };
  const trueClient = isValidPublicIp(headers.get("true-client-ip"));
  if (trueClient) return { ip: trueClient, source: "true-client" };
  const fly = isValidPublicIp(headers.get("fly-client-ip"));
  if (fly) return { ip: fly, source: "fly" };
  const xReal = isValidPublicIp(headers.get("x-real-ip"));
  if (xReal) return { ip: xReal, source: "x-real-ip" };
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    for (const candidate of xff.split(",")) {
      const ip = isValidPublicIp(candidate);
      if (ip) return { ip, source: "xff" };
    }
  }
  return { ip: null, source: null };
}

async function resolveClientIdentity(
  req: Request,
  endpoint: string,
): Promise<ClientIdentity> {
  const { ip, source: ipSource } = await resolveClientIp(req);
  const sub = jwtSubUnverified(req.headers.get("Authorization"));

  // Best: combine user + IP — handles NATs/shared devices without coupling
  // distinct users into one bucket and without letting one user evade limits
  // by hopping IPs.
  if (sub && ip) {
    return { ip, rateKey: `${endpoint}:u:${sub}:ip:${ip}`, source: "user+ip" };
  }
  if (sub) return { ip: null, rateKey: `${endpoint}:user:${sub}`, source: "user" };
  if (ip) return { ip, rateKey: `${endpoint}:ip:${ip}`, source: ipSource ?? "xff" };

  // Last resort: hash UA + accept-language to avoid one giant shared bucket.
  const headers = req.headers;
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

serve(withSentry("sign-ticket", async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const identity = await resolveClientIdentity(req, "sign-ticket");
    if (await isRateLimited(supabase, identity.rateKey)) {
      console.warn(
        `[sign-ticket] rate limited source=${identity.source} key=${identity.rateKey}`,
      );
      await logRateLimitEvent(supabase, {
        endpoint: "sign-ticket",
        rate_key: identity.rateKey,
        ip_address: identity.ip,
        user_role: "client",
      });
      return new Response(
        JSON.stringify({
          error: "rate_limited",
          code: "rate_limited",
          message: "Too many requests. Please try again later.",
          retry_after_seconds: RATE_LIMIT_WINDOW_SECONDS,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(RATE_LIMIT_WINDOW_SECONDS),
          },
          status: 429,
        },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !/^Bearer\s+\S/i.test(authHeader)) {
      return unauthorizedResponse(corsHeaders, "unauthenticated");
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();

    if (userErr || !user) {
      return unauthorizedResponse(corsHeaders, "invalid_token");
    }

    const body = await req.json();
    const {
      ticket_id,
      signer_name,
      signer_title,
      signer_initials,
      signer_email,
      signature_image,
      signature_date,
    } = body;

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!ticket_id || !UUID_RE.test(ticket_id)) throw new Error("Invalid ticket_id");
    if (!signer_name || typeof signer_name !== "string" || signer_name.length > 200) throw new Error("Invalid signer_name");
    if (signer_initials && signer_initials.length > 10) throw new Error("Invalid signer_initials");
    if (signature_image && typeof signature_image === "string" && signature_image.length > 500_000) throw new Error("Signature image too large");

    const { data: signer, error: signerErr } = await supabase
      .from("client_signers")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (signerErr || !signer) throw new Error("Client signer not found");

    const { data: ticket, error: ticketErr } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", ticket_id)
      .eq("client_id", signer.client_id)
      .single();

    if (ticketErr || !ticket) throw new Error("Ticket not found");

    if (!["sent", "viewed"].includes(ticket.status)) {
      throw new Error("Ticket cannot be signed from current status");
    }

    let signatureUrl: string | null = null;

    if (signature_image) {
      const base64 = String(signature_image).replace(/^data:image\/png;base64,/, "");
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const filePath = `${ticket.agency_id}/${ticket.id}/client-signature-v${ticket.version_number}.png`;

      const { error: uploadErr } = await supabase.storage
        .from("ticket-assets")
        .upload(filePath, bytes, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadErr) throw uploadErr;
      signatureUrl = filePath;
    }

    const { error: sigErr } = await supabase
      .from("ticket_signatures")
      .insert({
        ticket_id,
        signer_type: "client",
        signer_name,
        signer_title,
        signer_initials,
        signer_email,
        signature_image_url: signatureUrl,
        signed_at: signature_date || new Date().toISOString(),
      });

    if (sigErr) throw sigErr;

    const { data: updated, error: updateErr } = await supabase
      .from("tickets")
      .update({
        status: "signed",
        client_initials: signer_initials,
        supervisor_name: signer_name,
        supervisor_title: signer_title,
        signed_at: signature_date || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticket_id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Generate PDF copies
    try {
      await supabase.functions.invoke("generate-pdf", {
        body: { ticket_id, pdf_type: "agency_copy" },
      });
      await supabase.functions.invoke("generate-pdf", {
        body: { ticket_id, pdf_type: "client_copy" },
      });
      await supabase.functions.invoke("generate-pdf", {
        body: { ticket_id, pdf_type: "worker_copy" },
      });
    } catch (_) {
      // PDF generation failure should not block signing
    }

    // Notify agency (server-side only)
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
          ticket_id,
          recipient_type: "agency",
          template_key: "ticket_signed_agency",
        }),
      });
    } catch (_) {
      // Notification failure should not block signing
    }

    return new Response(JSON.stringify({ ticket: updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("[sign-ticket] internal error:", err);
    return new Response(JSON.stringify({ error: "An unexpected error occurred." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}));
