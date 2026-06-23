import { supabase } from "@/integrations/supabase/client";
import { Sentry, trackStep } from "@/instrument";

export async function downloadPdf(ticketId: string, pdfType: "draft" | "agency_copy" | "client_copy" | "worker_copy") {
  trackStep("pdf", "download requested", { ticket_id: ticketId, pdf_type: pdfType });
  try {
    const { data, error } = await supabase.functions.invoke("get-pdf-download", {
      body: {
        ticket_id: ticketId,
        pdf_type: pdfType,
      },
    });

    if (error) {
      trackStep("pdf", "edge function error", { ticket_id: ticketId, pdf_type: pdfType, message: error.message }, "error");
      const msg = error.message?.toLowerCase() || "";
      if (msg.includes("not found") || msg.includes("does not exist") || msg.includes("no rows")) {
        throw new Error("PDF not available yet. The document may still be generating, or PDF storage has not been configured.");
      }
      throw error;
    }

    if (!data?.url) {
      trackStep("pdf", "no url returned", { ticket_id: ticketId, pdf_type: pdfType }, "warning");
      throw new Error("PDF not available. The document may not have been generated yet, or the PDF pipeline is not fully configured.");
    }

    trackStep("pdf", "download succeeded", { ticket_id: ticketId, pdf_type: pdfType });
    window.open(data.url, "_blank");
  } catch (err: any) {
    Sentry.captureException(err, {
      tags: { feature: "pdf_download", pdf_type: pdfType, ticket_id: ticketId },
    });
    if (err.message?.includes("FunctionsFetchError") || err.message?.includes("Failed to fetch")) {
      throw new Error("PDF service is temporarily unavailable. Please try again later.");
    }
    throw err;
  }
}
