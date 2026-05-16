# Edge Function HTTP Status Code Mapping

This document is the canonical reference for how every Supabase Edge Function in
this project responds to authentication, authorization, and input-validation
failures. The contract is enforced by
[`supabase/functions/_shared/auth_integration_test.ts`](../supabase/functions/_shared/auth_integration_test.ts).

## Error response shape

All auth/authz failures return JSON:

```json
{ "error": "<human readable>", "code": "<machine code>" }
```

`code` is one of:

| code              | HTTP | Meaning                                                          |
| ----------------- | ---- | ---------------------------------------------------------------- |
| `unauthenticated` | 401  | Missing or malformed `Authorization` header (no/bad Bearer scheme) |
| `invalid_token`   | 401  | Bearer token present but rejected (expired, tampered, wrong key, bad webhook signature) |
| `forbidden`       | 403  | Caller authenticated but lacks the required role/secret           |

Input validation failures (missing body, missing query param, invalid UUID) return **400** with a function-specific JSON error.

## Per-function mapping

Legend:
- **User auth** — requires a real end-user JWT via `requireUser()` (`_shared/auth.ts`).
- **Service-only** — must be invoked from another edge function with the internal service secret. Never callable from the browser.
- **Webhook** — verifies an HMAC signature on the request.
- **Public** — intentionally callable without `Authorization` (still requires the project `apikey`).

| Function                       | Type         | 400 (bad input)                          | 401 (auth)                                                   | 403 (authz)                                | Notes |
| ------------------------------ | ------------ | ---------------------------------------- | ------------------------------------------------------------ | ------------------------------------------ | ----- |
| `mark-viewed`                  | User auth    | missing/invalid `ticket_id`              | no header / wrong scheme / invalid or expired JWT            | —                                          | |
| `get-pdf-download`             | User auth    | missing `ticket_id` or `pdf_type`        | no header / wrong scheme / invalid or expired JWT            | caller has no role on the ticket           | |
| `create-checkout-session`      | User auth    | missing `plan`                           | no header / wrong scheme / invalid or expired JWT            | —                                          | |
| `sign-ticket`                  | User auth    | missing `ticket_id`                      | no header / wrong scheme / invalid or expired JWT            | signer not assigned to ticket              | Runs Postgres rate-limit first; can also return **429**. |
| `send-ticket`                  | User auth    | missing `ticket_id`                      | no header / wrong scheme / invalid or expired JWT            | caller not agency admin for ticket         | Runs Postgres rate-limit first; can also return **429**. |
| `reject-ticket`                | User auth    | missing `ticket_id` or `reason`          | no header / wrong scheme / invalid or expired JWT            | signer not assigned to ticket              | Runs Postgres rate-limit first; can also return **429**. |
| `create-invite`                | User auth    | malformed payload                        | no header / wrong scheme / invalid or expired JWT            | caller not agency admin                    | |
| `preview-transactional-email`  | Internal API | invalid template name                    | missing/invalid `LOVABLE_API_KEY` bearer                     | —                                          | Used by admins; key is internal, not a user JWT. |
| `auth-email-hook`              | Webhook      | malformed Supabase hook body             | missing/invalid Supabase webhook secret                      | —                                          | |
| `handle-email-suppression`     | Webhook      | malformed Resend body                    | missing/invalid Resend webhook signature                     | —                                          | |
| `send-reminder`                | Service-only | —                                        | —                                                            | missing/invalid internal service secret    | Invoked by `pg_cron`. |
| `generate-pdf`                 | Service-only | missing `ticket_id` or `pdf_type`        | —                                                            | missing/invalid internal service secret    | Called by `sign-ticket` / `send-ticket`. |
| `send-notification-email`      | Service-only | missing recipient/template               | —                                                            | missing/invalid internal service secret    | Called by other edge functions. |
| `send-transactional-email`     | Gateway-gated | —                                       | Supabase gateway rejects (verify_jwt = true)                 | —                                          | Caller must present a valid project JWT before the function runs. |
| `accept-invite`                | Public       | missing/invalid token, expired token     | —                                                            | —                                          | No `Authorization` required by design. |
| `handle-email-unsubscribe`     | Public (GET) | missing `?token=` query param            | —                                                            | —                                          | No `Authorization` required by design. |
| `demo-login`                   | Public       | malformed payload                        | —                                                            | —                                          | Must NOT return 401/403 — guarded by a test. |

## Pre-auth ordering

A few functions intentionally run cheap protective checks **before** the auth gate:

- `sign-ticket`, `send-ticket`, `reject-ticket` — Postgres rate-limit (`check_rate_limit`) runs first to shield the auth path from brute-force. They still enforce the `Bearer` scheme regex and `getUser()` validation before any business DB write, and tests accept either 401 or 429 when called without a header.

Everything else rejects on auth before touching the database.

## Verification

Run the integration tests with the `test_edge_functions` tool, or locally:

```bash
deno test --allow-net --allow-env --allow-read \
  supabase/functions/_shared/auth_integration_test.ts
```

The test file is the source of truth — if you change a function's status contract, update the test and this table in the same change.
