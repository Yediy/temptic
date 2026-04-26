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

    const { ticket_id } = await req.json();
    if (!ticket_id || typeof ticket_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticket_id)) {
      throw new Error("Invalid ticket_id");
    }

    // Verify caller is a client signer
    const { data: signer, error: signerErr } = await supabase
      .from("client_signers")
      .select("client_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (signerErr || !signer) throw new Error("Client signer not found");

    // Fetch ticket — must belong to client and be in "sent" status
    const { data: ticket, error: ticketErr } = await supabase
      .from("tickets")
      .select("id, status, client_id")
      .eq("id", ticket_id)
      .eq("client_id", signer.client_id)
      .single();

    if (ticketErr || !ticket) throw new Error("Ticket not found");

    if (ticket.status !== "sent") {
      // Already viewed or in another state — not an error, just no-op
      return new Response(
        JSON.stringify({ ticket_id, status: ticket.status, changed: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const { data: updated, error: updateErr } = await supabase
      .from("tickets")
      .update({
        status: "viewed",
        viewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticket_id)
      .select("id, status")
      .single();

    if (updateErr) throw updateErr;

    return new Response(
      JSON.stringify({ ticket_id: updated.id, status: updated.status, changed: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    console.error("[mark-viewed] internal error:", err);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
