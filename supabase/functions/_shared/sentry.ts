// Shared Sentry helper for Supabase Edge Functions.
// Initializes Sentry once per function instance, exposes helpers to
// wrap handlers, add breadcrumbs, tag context, and capture errors —
// all without leaking sensitive data into events.

import * as Sentry from "npm:@sentry/deno@8.45.0";

let initialized = false;

function init(functionName: string) {
  if (initialized) return;
  const dsn = Deno.env.get("SENTRY_DSN");
  if (!dsn) {
    initialized = true; // don't spam on each call
    return;
  }
  try {
    Sentry.init({
      dsn,
      environment: Deno.env.get("SENTRY_ENVIRONMENT") ?? "production",
      release: Deno.env.get("SENTRY_RELEASE") ?? undefined,
      tracesSampleRate: 0.1,
      // Strip sensitive headers / data before sending.
      beforeSend(event) {
        try {
          if (event.request?.headers) {
            const h = event.request.headers as Record<string, string>;
            for (const key of Object.keys(h)) {
              const k = key.toLowerCase();
              if (
                k === "authorization" ||
                k === "cookie" ||
                k === "x-api-key" ||
                k.includes("token") ||
                k.includes("secret")
              ) {
                h[key] = "[Filtered]";
              }
            }
          }
          if (event.request?.data) {
            event.request.data = "[Filtered]";
          }
        } catch (_e) { /* noop */ }
        return event;
      },
    });
    Sentry.setTag("edge_function", functionName);
    initialized = true;
  } catch (e) {
    console.error("Sentry init failed:", e);
    initialized = true;
  }
}

export type SentryContext = {
  agency_id?: string | null;
  ticket_id?: string | null;
  client_id?: string | null;
  worker_id?: string | null;
  user_id?: string | null;
  request_id?: string | null;
  [key: string]: unknown;
};

export function setSentryContext(ctx: SentryContext) {
  try {
    for (const [k, v] of Object.entries(ctx)) {
      if (v == null) continue;
      Sentry.setTag(k, String(v));
    }
    if (ctx.user_id) {
      Sentry.setUser({ id: String(ctx.user_id) });
    }
  } catch (_e) { /* noop */ }
}

export function addBreadcrumb(
  message: string,
  data?: Record<string, unknown>,
  category = "business",
) {
  try {
    Sentry.addBreadcrumb({
      category,
      message,
      level: "info",
      data,
    });
  } catch (_e) { /* noop */ }
}

export function captureException(err: unknown, ctx?: SentryContext) {
  try {
    if (ctx) setSentryContext(ctx);
    Sentry.captureException(err);
  } catch (_e) { /* noop */ }
}

/**
 * Wrap an Edge Function handler so any thrown error is reported to Sentry
 * with the function name tagged. Returns a safe 500 JSON response on uncaught
 * errors so we never leak stack traces to the caller.
 */
export function withSentry(
  functionName: string,
  handler: (req: Request) => Promise<Response> | Response,
  corsHeaders: Record<string, string> = {},
): (req: Request) => Promise<Response> {
  init(functionName);
  return async (req: Request) => {
    // Fresh scope per request so tags from one request don't leak into the next.
    return await Sentry.withScope(async (scope) => {
      scope.setTag("edge_function", functionName);
      const reqId = req.headers.get("x-request-id");
      if (reqId) scope.setTag("request_id", reqId);
      try {
        return await handler(req);
      } catch (err) {
        console.error(`[${functionName}] unhandled error:`, err);
        Sentry.captureException(err);
        return new Response(
          JSON.stringify({ success: false, message: "An unexpected error occurred." }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    });
  };
}

export { Sentry };
