// Integration tests: every edge function must reject unauthenticated requests
// with the expected HTTP status BEFORE any database work happens.
//
// Run with:
//   deno test --allow-net --allow-env --allow-read \
//     supabase/functions/_shared/auth_integration_test.ts
//
// Or via the Lovable test_edge_functions tool.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL =
  Deno.env.get("VITE_SUPABASE_URL") ??
  Deno.env.get("SUPABASE_URL") ??
  "https://nwyjqphqszonzlulezsq.supabase.co";

const ANON_KEY =
  Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY") ??
  // Public anon key — safe to commit, matches `.env`.
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53eWpxcGhxc3pvbnpsdWxlenNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTg0OTUsImV4cCI6MjA4OTU5NDQ5NX0.hfKgD7Od9EhORBLR6wAiPMu3pFbYbL26wB1FMd_m0AM";

const FN_BASE = `${SUPABASE_URL}/functions/v1`;

/**
 * For each edge function we declare the status codes that are acceptable when
 * the caller omits an `Authorization` header. We accept multiple values where
 * the function legitimately runs additional validation (rate limit, payload)
 * that may surface before/after the auth gate.
 */
interface Case {
  fn: string;
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
  // Acceptable statuses. Most are 401; service-only functions return 403;
  // public functions that require a body return 400.
  expect: number[];
  reason: string;
}

const CASES: Case[] = [
  // ----- User-authenticated functions: must be 401 -----
  { fn: "mark-viewed",             expect: [401], body: { ticket_id: "00000000-0000-0000-0000-000000000000" }, reason: "requireUser" },
  { fn: "get-pdf-download",        expect: [401], body: { ticket_id: "00000000-0000-0000-0000-000000000000", pdf_type: "client_copy" }, reason: "requireUser" },
  { fn: "create-checkout-session", expect: [401], body: { plan: "monthly" }, reason: "requireUser" },
  { fn: "sign-ticket",             expect: [401, 429], body: { ticket_id: "00000000-0000-0000-0000-000000000000" }, reason: "scheme check (after rate-limit)" },
  { fn: "send-ticket",             expect: [401, 429], body: { ticket_id: "00000000-0000-0000-0000-000000000000" }, reason: "scheme check (after rate-limit)" },
  { fn: "reject-ticket",           expect: [401, 429], body: { ticket_id: "00000000-0000-0000-0000-000000000000" }, reason: "scheme check (after rate-limit)" },
  { fn: "create-invite",           expect: [401], body: {}, reason: "explicit 401" },
  { fn: "preview-transactional-email", expect: [401], body: {}, reason: "LOVABLE_API_KEY check" },
  { fn: "auth-email-hook",         expect: [401], body: { type: "signup" }, reason: "LOVABLE_API_KEY check" },

  // ----- Webhook functions: 401 on missing/invalid signature -----
  { fn: "handle-email-suppression", expect: [401], body: {}, reason: "webhook signature missing" },

  // ----- Service-only functions: must be 403 -----
  { fn: "send-reminder",           expect: [403], body: {}, reason: "internal service caller only" },
  { fn: "generate-pdf",            expect: [403], body: { ticket_id: "00000000-0000-0000-0000-000000000000", pdf_type: "client_copy" }, reason: "internal service caller only" },
  { fn: "send-notification-email", expect: [403], body: {}, reason: "internal service caller only" },

  // ----- Supabase-gated function (verify_jwt = true): gateway returns 401 -----
  { fn: "send-transactional-email", expect: [401], body: {}, reason: "Supabase gateway verify_jwt=true" },

  // ----- Public functions that still validate input: 400 when body is missing -----
  { fn: "accept-invite",            expect: [400], body: { action: "preview" }, reason: "public, requires valid token" },
  { fn: "handle-email-unsubscribe", expect: [400], method: "GET", reason: "public, requires ?token param" },
];

async function callNoAuth(c: Case): Promise<number> {
  const url = `${FN_BASE}/${c.fn}`;
  const method = c.method ?? "POST";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    // Supabase gateway always requires the project anon key as `apikey`.
    // We deliberately OMIT the `Authorization` header to exercise the auth
    // gate inside each function.
    apikey: ANON_KEY,
  };
  const res = await fetch(url, {
    method,
    headers,
    body: method === "POST" ? JSON.stringify(c.body ?? {}) : undefined,
  });
  // Always consume the body to avoid Deno resource leaks.
  await res.text();
  return res.status;
}

for (const c of CASES) {
  Deno.test(`[auth] ${c.fn} rejects request with no Authorization header (${c.reason})`, async () => {
    const status = await callNoAuth(c);
    assert(
      c.expect.includes(status),
      `Expected ${c.fn} -> one of [${c.expect.join(", ")}], got ${status}`,
    );
  });
}

// Sanity check: the demo-login endpoint is intentionally public and MUST NOT
// 401/403. This guards against accidentally gating it during refactors.
Deno.test("[auth] demo-login remains publicly callable", async () => {
  const res = await fetch(`${FN_BASE}/demo-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: "{}",
  });
  await res.text();
  assert(
    res.status !== 401 && res.status !== 403,
    `demo-login should be public, got ${res.status}`,
  );
});

// Sanity check: well-formed bogus Bearer token should still be 401 across all
// requireUser-protected functions (covers tampered/expired JWTs).
Deno.test("[auth] tampered Bearer token is rejected by user-auth functions", async () => {
  const tampered =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
    "eyJzdWIiOiJmYWtlIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJpYXQiOjEwLCJleHAiOjIwfQ." +
    "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
  const targets = ["mark-viewed", "get-pdf-download", "create-checkout-session", "create-invite"];
  for (const fn of targets) {
    const res = await fetch(`${FN_BASE}/${fn}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: ANON_KEY,
        Authorization: `Bearer ${tampered}`,
      },
      body: JSON.stringify({ ticket_id: "00000000-0000-0000-0000-000000000000", plan: "monthly", pdf_type: "client_copy" }),
    });
    await res.text();
    assertEquals(res.status, 401, `${fn} should reject tampered JWT, got ${res.status}`);
  }
});
