## Goal

Add Resend as a Lovable **connector** so the API key is workspace-managed and route sends via the connector gateway, while keeping all email logic in the existing **edge functions** (no frontend changes, no new architecture).

## Steps

1. **Link the Resend connector** via `standard_connectors--connect` with `connector_id: "resend"`. This provisions/refreshes `RESEND_API_KEY` and ensures `LOVABLE_API_KEY` is available to edge functions.

2. **Add a shared helper** `supabase/functions/_shared/resend.ts`:
   - Reads `LOVABLE_API_KEY` and `RESEND_API_KEY` from `Deno.env`.
   - Posts to `https://connector-gateway.lovable.dev/resend/emails` with:
     - `Authorization: Bearer ${LOVABLE_API_KEY}`
     - `X-Connection-Api-Key: ${RESEND_API_KEY}`
     - `Content-Type: application/json`
   - Signature: `sendEmail({ from, to, subject, html, text?, reply_to?, headers? })` → `{ ok, status, body }`.
   - On non-2xx, throws with status + body so callers can log to `notifications` and Sentry.

3. **Refactor every edge function that currently calls `https://api.resend.com/emails` directly** to use the helper. Confirmed/likely callers:
   - `send-notification-email/index.ts`
   - `send-transactional-email/index.ts`
   - `send-reminder/index.ts`
   - `send-ticket/index.ts`
   - `accept-invite/index.ts`, `create-invite/index.ts` (if they send)
   - `auth-email-hook/index.ts`
   - `handle-email-suppression/index.ts` (if it sends)
   
   I'll enumerate exact hits with `rg "api.resend.com|resend.com/emails|RESEND_API_KEY"` before editing and update only files that actually send.

4. **Preserve current behavior**:
   - Keep `EMAIL_FROM` env for the `from` address.
   - Keep the `notifications` table logging (queued → sent/failed/skipped).
   - Keep Sentry breadcrumbs and `captureException` on failures.
   - Keep the "no key configured → skipped" fallback: if either `LOVABLE_API_KEY` or `RESEND_API_KEY` is missing, mark `skipped` and return 200 as today.

5. **No schema changes. No frontend changes.**

6. **Verify**: `bunx vite build` for type safety, then rely on auto-deploy of edge functions. Optionally send a test via `admin-test-sentry`-style path (not required for DoD).

## Technical notes

- Connector gateway URL: `https://connector-gateway.lovable.dev/resend/emails`
- Two headers required: `Authorization: Bearer ${LOVABLE_API_KEY}` and `X-Connection-Api-Key: ${RESEND_API_KEY}`.
- Same `RESEND_API_KEY` secret name — no rename, no code path changes at call sites beyond swapping fetch → helper.
