import { supabase } from "@/integrations/supabase/client";

export async function downloadPdf(ticketId: string, pdfType: "draft" | "agency_copy" | "client_copy" | "worker_copy") {
  try {
    const { data, error } = await supabase.functions.invoke("get-pdf-download", {
      body: {
        ticket_id: ticketId,
        pdf_type: pdfType,
      },
    });

    if (error) {
      // Check if this is a configuration/setup issue vs a real error
      const msg = error.message?.toLowerCase() || "";
      if (msg.includes("not found") || msg.includes("does not exist") || msg.includes("no rows")) {
        throw new Error("PDF not available yet. The document may still be generating, or PDF storage has not been configured.");
      }
      throw error;
    }

    if (!data?.url) {
      throw new Error("PDF not available. The document may not have been generated yet, or the PDF pipeline is not fully configured.");
    }

    window.open(data.url, "_blank");
  } catch (err: any) {
    // Re-throw with a clearer message for common failure modes
    if (err.message?.includes("FunctionsFetchError") || err.message?.includes("Failed to fetch")) {
      throw new Error("PDF service is temporarily unavailable. Please try again later.");
    }
    throw err;
  }
}
