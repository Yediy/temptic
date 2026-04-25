import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Distributed rate limiter (Postgres-backed)
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX = 10;

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";
    if (isRateLimited(`sign-ticket:${clientIp}`)) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth header");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();

    if (userErr || !user) throw new Error("Unauthorized");

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
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
