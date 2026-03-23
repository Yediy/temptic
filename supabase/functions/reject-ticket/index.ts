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

    const { ticket_id, rejection_reason } = await req.json();

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
      throw new Error("Ticket cannot be rejected from current status");
    }

    const { data: updated, error: updateErr } = await supabase
      .from("tickets")
      .update({
        status: "rejected",
        rejected_at: new Date().toISOString(),
        rejection_reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticket_id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Notify agency
    try {
      const { data: agencyUser } = await supabase
        .from("agency_members")
        .select("user_id")
        .eq("agency_id", ticket.agency_id)
        .eq("is_active", true)
        .limit(1)
        .single();

      if (agencyUser?.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", agencyUser.user_id)
          .single();

        if (profile?.email) {
          await supabase.functions.invoke("send-notification-email", {
            body: {
              agency_id: ticket.agency_id,
              ticket_id,
              recipient_type: "agency",
              recipient_id: agencyUser.user_id,
              to: profile.email,
              subject: `Ticket ${ticket.ticket_number} rejected`,
              html: `<p>Ticket <strong>${ticket.ticket_number}</strong> was rejected.</p><p>Reason: ${rejection_reason}</p>`,
              template_key: "ticket_rejected_agency",
            },
          });
        }
      }
    } catch (_) {
      // Notification failure should not block rejection
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
