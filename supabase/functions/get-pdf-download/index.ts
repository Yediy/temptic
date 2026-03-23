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

    const { ticket_id, pdf_type } = await req.json();

    // Determine caller's relationship to the ticket
    const { data: membership } = await supabase
      .from("agency_members")
      .select("agency_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    const { data: clientSigner } = await supabase
      .from("client_signers")
      .select("client_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: worker } = await supabase
      .from("workers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    // Fetch ticket with tenant isolation for agency users
    let ticket: any = null;
    if (membership?.agency_id) {
      const { data, error: ticketErr } = await supabase
        .from("tickets")
        .select("*")
        .eq("id", ticket_id)
        .eq("agency_id", membership.agency_id)
        .single();
      if (!ticketErr) ticket = data;
    }

    // If not found via agency, try client/worker path
    if (!ticket) {
      const { data } = await supabase
        .from("tickets")
        .select("*")
        .eq("id", ticket_id)
        .single();
      ticket = data;
    }

    if (!ticket) throw new Error("Ticket not found");

    const isAgency = membership?.agency_id === ticket.agency_id;
    const isClient = clientSigner?.client_id === ticket.client_id;
    const isWorker = worker?.id === ticket.worker_id;

    if (
      (pdf_type === "agency_copy" && !isAgency) ||
      (pdf_type === "client_copy" && !isClient && !isAgency) ||
      (pdf_type === "worker_copy" && !isWorker && !isAgency)
    ) {
      throw new Error("Forbidden");
    }

    const { data: pdfDoc, error: pdfErr } = await supabase
      .from("pdf_documents")
      .select("*")
      .eq("ticket_id", ticket_id)
      .eq("pdf_type", pdf_type)
      .order("generated_at", { ascending: false })
      .limit(1)
      .single();

    if (pdfErr || !pdfDoc) throw new Error("PDF not found");

    const { data: signedUrlData, error: signedUrlErr } = await supabase.storage
      .from("ticket-assets")
      .createSignedUrl(pdfDoc.storage_url, 60 * 10);

    if (signedUrlErr) throw signedUrlErr;

    // Log the download
    await supabase.from("download_logs").insert({
      ticket_id,
      pdf_document_id: pdfDoc.id,
      downloaded_by_role: isAgency ? "agency" : isClient ? "client" : "worker",
      downloaded_by_id: user.id,
      user_agent: req.headers.get("user-agent") || null,
    });

    return new Response(
      JSON.stringify({
        url: signedUrlData.signedUrl,
        file_name: pdfDoc.file_name,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
