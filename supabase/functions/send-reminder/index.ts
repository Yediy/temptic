import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Only allow internal calls (cron or service-key authenticated)
    const internalSecret = req.headers.get("x-internal-secret");
    const authHeader = req.headers.get("Authorization");
    const isInternal = internalSecret === serviceKey;
    const isCron = authHeader === `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`;

    if (!isInternal && !isCron) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Get agency settings for reminder threshold (default 24 hours)
    const { data: agencies } = await supabase
      .from("agency_settings")
      .select("agency_id, reminder_hours");

    const reminderMap = new Map<string, number>();
    for (const a of agencies ?? []) {
      reminderMap.set(a.agency_id, a.reminder_hours ?? 24);
    }

    // Find tickets in sent/viewed status that exceed the reminder threshold
    const { data: staleTickets, error: staleErr } = await supabase
      .from("tickets")
      .select("id, agency_id, client_id, ticket_number, sent_at, status")
      .in("status", ["sent", "viewed"])
      .not("sent_at", "is", null);

    if (staleErr) throw staleErr;

    const now = Date.now();
    let reminded = 0;

    for (const ticket of staleTickets ?? []) {
      const thresholdHours = reminderMap.get(ticket.agency_id) ?? 24;
      const sentAt = new Date(ticket.sent_at).getTime();
      const hoursElapsed = (now - sentAt) / (1000 * 60 * 60);

      if (hoursElapsed < thresholdHours) continue;

      // Check if we already sent a reminder recently (within threshold period)
      const { data: existingReminder } = await supabase
        .from("notifications")
        .select("id")
        .eq("ticket_id", ticket.id)
        .eq("template_key", "ticket_reminder_client")
        .gte("created_at", new Date(now - thresholdHours * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (existingReminder && existingReminder.length > 0) continue;

      // Find client signer email
      const { data: signer } = await supabase
        .from("client_signers")
        .select("email, first_name")
        .eq("client_id", ticket.client_id)
        .eq("is_active", true)
        .limit(1)
        .single();

      if (!signer?.email) continue;

      // Log notification
      await supabase.from("notifications").insert({
        agency_id: ticket.agency_id,
        ticket_id: ticket.id,
        recipient_type: "client",
        recipient_email: signer.email,
        template_key: "ticket_reminder_client",
        subject: `Reminder: Ticket ${ticket.ticket_number} awaiting signature`,
        status: "queued",
      });

      // Attempt to send via send-notification-email pattern
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        try {
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: Deno.env.get("EMAIL_FROM") || "Temp Tic <no-reply@temptic.com>",
              to: [signer.email],
              subject: `Reminder: Ticket ${ticket.ticket_number} awaiting signature`,
              html: `<p>Hi${signer.first_name ? ` ${signer.first_name}` : ""},</p>
                <p>This is a reminder that ticket <strong>${ticket.ticket_number}</strong> is still awaiting your signature.</p>
                <p>Please log in to sign or reject the ticket at your earliest convenience.</p>`,
            }),
          });

          const status = emailRes.ok ? "sent" : "failed";
          const errorMsg = emailRes.ok ? null : await emailRes.text();

          await supabase
            .from("notifications")
            .update({
              status,
              error_message: errorMsg,
              sent_at: emailRes.ok ? new Date().toISOString() : null,
            })
            .eq("ticket_id", ticket.id)
            .eq("template_key", "ticket_reminder_client")
            .eq("status", "queued")
            .order("created_at", { ascending: false })
            .limit(1);
        } catch (e: any) {
          await supabase
            .from("notifications")
            .update({ status: "failed", error_message: e.message })
            .eq("ticket_id", ticket.id)
            .eq("template_key", "ticket_reminder_client")
            .eq("status", "queued");
        }
      }

      reminded++;
    }

    return new Response(
      JSON.stringify({ success: true, reminders_sent: reminded }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
