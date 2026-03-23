import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PdfRequest {
  ticket_id: string;
  pdf_type: "draft" | "agency_copy" | "client_copy" | "worker_copy";
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function generateTicketHtml(ticket: any, pdfType: string, days?: any[]): string {
  const isWorkerCopy = pdfType === "worker_copy";
  const isDraft = pdfType === "draft";

  const ppeItems = [
    ticket.hard_hat_required && "Hard Hat",
    ticket.boots_required && "Safety Boots",
    ticket.glasses_required && "Safety Glasses",
    ticket.gloves_required && "Gloves",
    ticket.vest_required && "Hi-Vis Vest",
  ].filter(Boolean).join(", ") || "None";

  const clientDisplay = isWorkerCopy
    ? (ticket.client_company_name_snapshot || "").split(" ").map((w: string) => w[0] || "").join("").toUpperCase()
    : escapeHtml(ticket.client_company_name_snapshot);

  const watermark = isDraft ? `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);font-size:120px;color:rgba(0,0,0,0.06);font-weight:bold;z-index:0;">DRAFT</div>` : "";

  const copyLabel = {
    draft: "DRAFT",
    agency_copy: "AGENCY COPY",
    client_copy: "CLIENT COPY",
    worker_copy: "WORKER COPY",
  }[pdfType] || pdfType.toUpperCase();

  let daysHtml = "";
  if (ticket.ticket_type === "weekly" && days && days.length > 0) {
    const dayRows = days.map((d: any) => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-weight:500;">${escapeHtml(d.day_name)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${d.day_date}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${d.start_time || "—"}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${d.end_time || "—"}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-family:monospace;">${d.regular_hours}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-family:monospace;">${d.overtime_hours}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:bold;font-family:monospace;">${d.total_hours}</td>
      </tr>
    `).join("");

    daysHtml = `
      <h3 style="margin:24px 0 8px;font-size:14px;color:#374151;">Daily Breakdown</h3>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;">Day</th>
            <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;">Date</th>
            <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;">Start</th>
            <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;">End</th>
            <th style="padding:8px 10px;text-align:right;font-size:11px;color:#6b7280;">Reg</th>
            <th style="padding:8px 10px;text-align:right;font-size:11px;color:#6b7280;">OT</th>
            <th style="padding:8px 10px;text-align:right;font-size:11px;color:#6b7280;">Total</th>
          </tr>
        </thead>
        <tbody>${dayRows}</tbody>
      </table>
    `;
  }

  const signatureSection = isWorkerCopy ? "" : `
    <div style="margin-top:32px;padding-top:16px;border-top:2px solid #e5e7eb;">
      <h3 style="font-size:14px;color:#374151;margin-bottom:12px;">Signatures</h3>
      <div style="display:flex;gap:40px;">
        <div style="flex:1;">
          <p style="font-size:11px;color:#6b7280;margin-bottom:4px;">Client Supervisor</p>
          <p style="font-size:13px;font-weight:600;">${escapeHtml(ticket.supervisor_name) || "________________"}</p>
          <p style="font-size:11px;color:#6b7280;">${escapeHtml(ticket.supervisor_title) || ""}</p>
        </div>
        <div style="flex:1;">
          <p style="font-size:11px;color:#6b7280;margin-bottom:4px;">Date Signed</p>
          <p style="font-size:13px;">${ticket.signed_at ? new Date(ticket.signed_at).toLocaleDateString() : "________________"}</p>
        </div>
      </div>
    </div>
  `;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin:0; padding:40px; color:#111827; font-size:13px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; padding-bottom:16px; border-bottom:3px solid #111827; }
  .row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #f3f4f6; }
  .label { color:#6b7280; font-size:12px; }
  .value { font-weight:500; text-align:right; }
</style></head>
<body>
  ${watermark}
  <div class="header">
    <div>
      <h1 style="margin:0;font-size:22px;letter-spacing:-0.5px;">TEMP TIC</h1>
      <p style="margin:4px 0 0;font-size:11px;color:#6b7280;">Labor Ticket System</p>
    </div>
    <div style="text-align:right;">
      <p style="margin:0;font-size:16px;font-weight:700;font-family:monospace;letter-spacing:1px;">${escapeHtml(ticket.ticket_number)}</p>
      <p style="margin:2px 0 0;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:2px;">${copyLabel}</p>
      <p style="margin:2px 0 0;font-size:10px;color:#6b7280;">${ticket.ticket_type.toUpperCase()} TICKET</p>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;">
    <div>
      <h3 style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Client</h3>
      <p style="font-size:15px;font-weight:600;margin:0;">${clientDisplay}</p>
      ${!isWorkerCopy && ticket.site_name_snapshot ? `<p style="font-size:12px;color:#374151;margin:2px 0;">${escapeHtml(ticket.site_name_snapshot)}</p>` : ""}
      ${!isWorkerCopy && ticket.site_address_snapshot ? `<p style="font-size:11px;color:#6b7280;margin:0;">${escapeHtml(ticket.site_address_snapshot)}</p>` : ""}
    </div>
    <div>
      <h3 style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Worker</h3>
      <p style="font-size:15px;font-weight:600;margin:0;">${escapeHtml(ticket.worker_name_snapshot)}</p>
      ${ticket.job_title ? `<p style="font-size:12px;color:#374151;margin:2px 0;">${escapeHtml(ticket.job_title)}</p>` : ""}
    </div>
  </div>

  <div style="margin-bottom:24px;">
    <h3 style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Details</h3>
    ${ticket.ticket_type === "daily" ? `
      <div class="row"><span class="label">Work Date</span><span class="value">${ticket.work_date || "—"}</span></div>
      <div class="row"><span class="label">Start Time</span><span class="value">${ticket.start_time || "—"}</span></div>
    ` : `
      <div class="row"><span class="label">Week</span><span class="value">${ticket.week_start_date} — ${ticket.week_end_date}</span></div>
    `}
    <div class="row"><span class="label">Total Hours</span><span class="value" style="font-size:16px;font-weight:700;">${ticket.total_hours ?? 0}h</span></div>
    <div class="row"><span class="label">PPE Required</span><span class="value">${ppeItems}</span></div>
    ${ticket.equipment_required ? `<div class="row"><span class="label">Equipment</span><span class="value">${escapeHtml(ticket.equipment_required)}</span></div>` : ""}
    ${!isWorkerCopy && ticket.notes ? `<div class="row"><span class="label">Notes</span><span class="value" style="max-width:60%;text-align:right;">${escapeHtml(ticket.notes)}</span></div>` : ""}
  </div>

  ${daysHtml}
  ${signatureSection}

  <div style="margin-top:40px;text-align:center;font-size:10px;color:#9ca3af;">
    Generated ${new Date().toISOString().split("T")[0]} · Temp Tic Labor Ticket System
  </div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { ticket_id, pdf_type } = (await req.json()) as PdfRequest;

    // Fetch ticket
    const { data: ticket, error: ticketErr } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", ticket_id)
      .single();
    if (ticketErr || !ticket) throw new Error("Ticket not found");

    // Fetch days for weekly tickets
    let days: any[] = [];
    if (ticket.ticket_type === "weekly") {
      const { data } = await supabase
        .from("ticket_days")
        .select("*")
        .eq("ticket_id", ticket_id)
        .order("day_date");
      days = data ?? [];
    }

    // Generate HTML
    const html = generateTicketHtml(ticket, pdf_type, days);

    // Store PDF record (HTML stored as storage_url for now - will be replaced with actual PDF when Puppeteer is available)
    const fileName = `${ticket.ticket_number}_${pdf_type}.html`;
    const storageUrl = `tickets/${ticket.agency_id}/${ticket_id}/${fileName}`;

    // Get existing version count
    const { data: existing } = await supabase
      .from("pdf_documents")
      .select("version_number")
      .eq("ticket_id", ticket_id)
      .eq("pdf_type", pdf_type)
      .order("version_number", { ascending: false })
      .limit(1);

    const version = (existing?.[0]?.version_number ?? 0) + 1;

    // Insert PDF document record
    const { data: pdfDoc, error: pdfErr } = await supabase
      .from("pdf_documents")
      .insert({
        ticket_id,
        pdf_type,
        file_name: fileName,
        storage_url: storageUrl,
        version_number: version,
      })
      .select()
      .single();

    if (pdfErr) throw pdfErr;

    return new Response(
      JSON.stringify({ id: pdfDoc.id, html, storage_url: storageUrl, file_name: fileName }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
