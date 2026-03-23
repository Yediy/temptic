import { supabase } from "@/integrations/supabase/client";

export async function downloadPdf(ticketId: string, pdfType: "draft" | "agency_copy" | "client_copy" | "worker_copy") {
  const { data, error } = await supabase.functions.invoke("get-pdf-download", {
    body: {
      ticket_id: ticketId,
      pdf_type: pdfType,
    },
  });

  if (error) throw error;
  window.open(data.url, "_blank");
}
