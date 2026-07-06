// Shared Resend sender. Prefers the Lovable connector gateway when
// LOVABLE_API_KEY is present; otherwise falls back to calling the Resend API
// directly with RESEND_API_KEY. Callers keep their own notification/audit
// logging — this helper only performs transport.

export interface SendEmailInput {
  from?: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string | string[];
  headers?: Record<string, string>;
  cc?: string | string[];
  bcc?: string | string[];
  tags?: { name: string; value: string }[];
}

export interface SendEmailResult {
  ok: boolean;
  status: number;
  body: string;
  transport: "gateway" | "direct" | "skipped";
}

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend/emails";
const DIRECT_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "Temp Tic <no-reply@temptic.com>";

export function resendConfigured(): boolean {
  return Boolean(Deno.env.get("RESEND_API_KEY"));
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");

  if (!resendKey) {
    return { ok: false, status: 0, body: "RESEND_API_KEY not configured", transport: "skipped" };
  }

  const payload = {
    from: input.from || Deno.env.get("EMAIL_FROM") || DEFAULT_FROM,
    to: Array.isArray(input.to) ? input.to : [input.to],
    subject: input.subject,
    ...(input.html ? { html: input.html } : {}),
    ...(input.text ? { text: input.text } : {}),
    ...(input.reply_to ? { reply_to: input.reply_to } : {}),
    ...(input.headers ? { headers: input.headers } : {}),
    ...(input.cc ? { cc: input.cc } : {}),
    ...(input.bcc ? { bcc: input.bcc } : {}),
    ...(input.tags ? { tags: input.tags } : {}),
  };

  const useGateway = Boolean(lovableKey);
  const url = useGateway ? GATEWAY_URL : DIRECT_URL;
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (useGateway) {
    headers["Authorization"] = `Bearer ${lovableKey}`;
    headers["X-Connection-Api-Key"] = resendKey;
  } else {
    headers["Authorization"] = `Bearer ${resendKey}`;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const body = await res.text();

  return {
    ok: res.ok,
    status: res.status,
    body,
    transport: useGateway ? "gateway" : "direct",
  };
}
