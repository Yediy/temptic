import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const release =
  (import.meta.env.VITE_SENTRY_RELEASE as string | undefined) ||
  (import.meta.env.VITE_APP_VERSION as string | undefined);

// Fields we never want appearing in fetch/xhr breadcrumb bodies or query strings.
const SENSITIVE_KEYS = [
  "password",
  "token",
  "access_token",
  "refresh_token",
  "signature_image",
  "signature",
  "signer_email",
  "email",
  "phone",
  "ssn",
  "rate",
  "hourly_rate",
  "notes",
  "rejection_reason",
];

function scrubObject<T>(input: T): T {
  if (!input || typeof input !== "object") return input;
  if (Array.isArray(input)) return input.map(scrubObject) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.includes(k.toLowerCase())) {
      out[k] = "[Filtered]";
    } else if (v && typeof v === "object") {
      out[k] = scrubObject(v);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

if (dsn) {
  Sentry.init({
    dsn,
    release,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
    sendDefaultPii: false,
    beforeBreadcrumb(breadcrumb, hint) {
      // Strip sensitive fields out of fetch/xhr request bodies before they're attached.
      if (breadcrumb.category === "fetch" || breadcrumb.category === "xhr") {
        const req = hint?.input?.[1] as RequestInit | undefined;
        if (req?.body && typeof req.body === "string") {
          try {
            const parsed = JSON.parse(req.body);
            breadcrumb.data = {
              ...breadcrumb.data,
              request_body: scrubObject(parsed),
            };
          } catch {
            // non-JSON body — don't attach it
          }
        }
        // Mark failed requests for easy filtering
        if (
          typeof breadcrumb.data?.status_code === "number" &&
          breadcrumb.data.status_code >= 400
        ) {
          breadcrumb.level = "error";
        }
      }
      return breadcrumb;
    },
    beforeSend(event) {
      // Defensive: nuke any `extra.body` / form payloads accidentally attached.
      if (event.extra) event.extra = scrubObject(event.extra);
      if (event.contexts) event.contexts = scrubObject(event.contexts);
      return event;
    },
  });
}

// --- Context helpers ------------------------------------------------------

export function setSentryUser(user: {
  id: string;
  portal?: string | null;
  roles?: string[];
  agencyId?: string | null;
} | null) {
  if (!dsn) return;
  if (!user) {
    Sentry.setUser(null);
    Sentry.setTag("agency_id", undefined as unknown as string);
    Sentry.setTag("portal", undefined as unknown as string);
    return;
  }
  Sentry.setUser({ id: user.id }); // NO email / PII
  Sentry.setTag("portal", user.portal ?? "unknown");
  if (user.agencyId) Sentry.setTag("agency_id", user.agencyId);
  if (user.roles?.length) Sentry.setTag("role", user.roles[0]);
}

export function setTicketContext(ctx: {
  ticketId?: string | null;
  ticketNumber?: string | null;
  clientId?: string | null;
  agencyId?: string | null;
}) {
  if (!dsn) return;
  Sentry.setContext("ticket", {
    ticket_id: ctx.ticketId ?? null,
    ticket_number: ctx.ticketNumber ?? null,
    client_id: ctx.clientId ?? null,
    agency_id: ctx.agencyId ?? null,
  });
  if (ctx.ticketId) Sentry.setTag("ticket_id", ctx.ticketId);
  if (ctx.clientId) Sentry.setTag("client_id", ctx.clientId);
}

export function clearTicketContext() {
  if (!dsn) return;
  Sentry.setContext("ticket", null);
}

export function trackStep(
  category: string,
  message: string,
  data?: Record<string, unknown>,
  level: Sentry.SeverityLevel = "info",
) {
  if (!dsn) return;
  Sentry.addBreadcrumb({
    category,
    message,
    level,
    data: data ? scrubObject(data) : undefined,
  });
}

export { Sentry };
