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

    const { data: ticket, error: ticketErr } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", ticket_id)
      .single();

    if (ticketErr || !ticket) throw new Error("Ticket not found");

    // Check authorization
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const roleList = (roles ?? []).map((r: any) => r.role);

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

    const isAgency = roleList.some((r: string) =>
      ["super_admin", "agency_admin", "dispatcher", "payroll", "viewer"].includes(r)
    );
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
