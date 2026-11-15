/** Milliseconds until each still-active link expires (only links expiring within the timer horizon). */
export function pendingExpiries(
  links: { id: string; expires_at: string | null; revoked_at: string | null; used_count: number; max_uses: number }[],
  now = Date.now(),
  horizonMs = 24 * 3_600_000,
): { id: string; delay: number }[] {
  return links
    .filter((l) => l.expires_at && !l.revoked_at && l.used_count < l.max_uses)
    .map((l) => ({ id: l.id, delay: Date.parse(l.expires_at as string) - now }))
    .filter((x) => x.delay > 0 && x.delay <= horizonMs);
}
