export type ScreeningDocument = {
  id: string; document_version: number; order_id?: string; has_document?: boolean;
  received_at?: string; result?: string; summary?: unknown;
  created_at?: string; consent_type?: string; consent_text?: string | null; signed_at?: string | null;
};

export function canSignConsent(record: ScreeningDocument, acknowledged: boolean) {
  return acknowledged && !record.signed_at && !!record.consent_text?.trim();
}

export function screeningText(type: "report" | "consent", record: ScreeningDocument) {
  const header = `${type === "report" ? "Screening report" : "Screening consent"}\nRecord: ${record.id}\nVersion: ${record.document_version}\n`;
  return type === "report"
    ? `${header}Received: ${record.received_at ?? "Not recorded"}\nResult: ${record.result ?? "Not recorded"}\n\n${JSON.stringify(record.summary ?? {}, null, 2)}\n`
    : `${header}Type: ${record.consent_type ?? "Not recorded"}\nSigned: ${record.signed_at ?? "Not signed"}\n\n${record.consent_text ?? "Consent wording is not available."}\n`;
}

export function downloadScreeningBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}