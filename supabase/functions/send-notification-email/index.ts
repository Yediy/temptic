import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify internal caller via service role key header
    const internalSecret = req.headers.get("x-internal-secret");
    if (internalSecret !== serviceKey) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const {
      agency_id,
      ticket_id,
      recipient_type,
      recipient_id,
      template_key,
    } = await req.json();

    if (!ticket_id || !recipient_type) {
      throw new Error("Missing ticket_id or recipient_type");
    }

    // Look up ticket to construct email server-side
    const { data: ticket, error: ticketErr } = await supabase
      .from("tickets")
      .select("ticket_number, client_id, agency_id, status, rejection_reason")
      .eq("id", ticket_id)
      .single();

    if (ticketErr || !ticket) throw new Error("Ticket not found");

    // Determine recipient email and construct subject/html server-side
    let to: string | null = null;
    let subject = "";
    let html = "";
    const ticketNum = escapeHtml(ticket.ticket_number);

    if (template_key === "ticket_sent_client") {
      // Find client signer email
      const { data: signer } = await supabase
        .from("client_signers")
        .select("email")
        .eq("client_id", ticket.client_id)
        .eq("is_active", true)
        .limit(1)
        .single();
      to = signer?.email || null;
      subject = `Ticket ${ticket.ticket_number} ready for signature`;
      html = `<p>Ticket <strong>${ticketNum}</strong> is ready for your signature.</p>`;
    } else if (template_key === "ticket_signed_agency") {
      // Find agency admin email — try profiles first, fall back to agency.email
      const { data: members } = await supabase
        .from("agency_members")
        .select("user_id")
        .eq("agency_id", ticket.agency_id)
        .eq("is_active", true)
        .order("created_at")
        .limit(5);
      if (members && members.length > 0) {
        for (const member of members) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", member.user_id)
            .single();
          if (profile?.email) { to = profile.email; break; }
        }
      }
      // Fallback: use agency email if no profile email found
      if (!to) {
        const { data: agency } = await supabase
          .from("agencies")
          .select("email")
          .eq("id", ticket.agency_id)
          .single();
        to = agency?.email || null;
      }
      subject = `Ticket ${ticket.ticket_number} signed`;
      html = `<p>Ticket <strong>${ticketNum}</strong> has been signed by the client.</p>`;
    } else if (template_key === "ticket_rejected_agency") {
      // Find agency admin email — same fallback strategy
      const { data: members } = await supabase
        .from("agency_members")
        .select("user_id")
        .eq("agency_id", ticket.agency_id)
        .eq("is_active", true)
        .order("created_at")
        .limit(5);
      if (members && members.length > 0) {
        for (const member of members) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", member.user_id)
            .single();
          if (profile?.email) { to = profile.email; break; }
        }
      }
      if (!to) {
        const { data: agency } = await supabase
          .from("agencies")
          .select("email")
          .eq("id", ticket.agency_id)
          .single();
        to = agency?.email || null;
      }
      const safeReason = ticket.rejection_reason ? escapeHtml(ticket.rejection_reason) : "No reason provided";
      subject = `Ticket ${ticket.ticket_number} rejected`;
      html = `<p>Ticket <strong>${ticketNum}</strong> was rejected.</p><p>Reason: ${safeReason}</p>`;
    } else {
      throw new Error("Unknown template_key");
    }

    if (!to) {
      console.log(`[notification-email] No recipient found for ${template_key}`);
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Log notification to notifications table
    const notifPayload = {
      agency_id: agency_id || ticket.agency_id,
      ticket_id,
      recipient_type,
      recipient_id: recipient_id || null,
      recipient_email: to,
      template_key,
      subject,
      status: "queued" as string,
    };

    const { data: notifRow } = await supabase
      .from("notifications")
      .insert(notifPayload)
      .select("id")
      .single();

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.log(`[notification-email] No RESEND_API_KEY configured. Would send "${subject}" to ${to}`);
      if (notifRow?.id) {
        await supabase.from("notifications").update({ status: "skipped" }).eq("id", notifRow.id);
      }
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: Deno.env.get("EMAIL_FROM") || "Temp Tic <no-reply@temptic.com>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!emailRes.ok) {
      const text = await emailRes.text();
      console.error(`[notification-email] Send failed: ${text}`);
      if (notifRow?.id) {
        await supabase.from("notifications").update({ status: "failed", error_message: text }).eq("id", notifRow.id);
      }
      throw new Error(text);
    }

    if (notifRow?.id) {
      await supabase.from("notifications").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", notifRow.id);
    }

    return new Response(JSON.stringify({ success: true }), {
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
