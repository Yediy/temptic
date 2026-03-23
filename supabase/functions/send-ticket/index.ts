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
      throw new Error("Ticket cannot be sent from current status");
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

    // Try to send notification email to client signer
    const { data: signer } = await supabase
      .from("client_signers")
      .select("id, email")
      .eq("client_id", ticket.client_id)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (signer?.email) {
      try {
        await supabase.functions.invoke("send-notification-email", {
          body: {
            agency_id: ticket.agency_id,
            ticket_id: ticket.id,
            recipient_type: "client",
            recipient_id: signer.id,
            to: signer.email,
            subject: `Ticket ${ticket.ticket_number} ready for signature`,
            html: `<p>Ticket <strong>${ticket.ticket_number}</strong> is ready for signature.</p>`,
            template_key: "ticket_sent_client",
          },
        });
      } catch (_) {
        // Notification failure should not block the send
      }
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
