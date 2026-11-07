import { supabase } from "@/integrations/supabase/client";

export type ScreeningRecordType = "order" | "report" | "consent";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = supabase.rpc as any;

/** Records that the current user viewed these screening records. Never throws. */
export async function logScreeningRead(type: ScreeningRecordType, ids: string[], context?: string) {
  if (!ids.length) return;
  const { error } = await rpc("log_screening_access", {
    _record_type: type,
    _record_ids: ids.slice(0, 500),
    _context: context ?? null,
  });
  if (error) console.warn("screening audit log failed", error.message);
}

/** Fetches a document link; the download is logged server-side. */
export async function getScreeningDocument(type: Exclude<ScreeningRecordType, "order">, id: string) {
  const { data, error } = await rpc("get_screening_document", { _record_type: type, _record_id: id });
  if (error) throw error;
  return data as string | null;
}

/** Worker signs their own consent; the signature is logged server-side. */
export async function signScreeningConsent(id: string) {
  const { data, error } = await rpc("sign_screening_consent", { _consent_id: id });
  if (error) throw error;
  return data as string;
}
