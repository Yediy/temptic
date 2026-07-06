## Answer

No — you don't need the `EMAIL_FROM` secret anymore. Since your verified Resend domain is `temptic.net`, we can hardcode the sender in the shared helper as the single source of truth.

## Change

In `supabase/functions/_shared/resend.ts`:

- Replace the current default (`Temp Tic <no-reply@temptic.com>`) with `Temp Tic <no-reply@temptic.net>`.
- Remove the `Deno.env.get("EMAIL_FROM")` lookup. The `from` field resolves as: caller-provided `input.from` → hardcoded `DEFAULT_FROM` (`Temp Tic <no-reply@temptic.net>`).
- No other edge functions currently pass a custom `from`, so all outbound mail will send from `no-reply@temptic.net`.

## Notes

- If you later want per-email overrides (e.g. `notifications@temptic.net` vs `billing@temptic.net`), callers can pass `from` directly — no env var needed.
- You can delete the `EMAIL_FROM` secret from Supabase after this change; nothing else references it.
- No frontend changes, no schema changes.
