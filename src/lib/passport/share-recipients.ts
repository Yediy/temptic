// Per-recipient share link planning: each recipient gets their own token and scope set.
export const SHARE_SECTIONS = [
  "identity", "verifications", "compliance", "credentials", "skills", "training",
  "badges", "reputation", "portfolio", "availability", "work_history",
] as const;
export type ShareSection = (typeof SHARE_SECTIONS)[number];

export type AccessLevel = "full" | "limited";
export interface RecipientDraft {
  key: string; name: string; access: AccessLevel; sections: ShareSection[];
  expiresInHours: number; oneTime: boolean; maxUses: number;
}

export function newRecipient(key: string): RecipientDraft {
  return { key, name: "", access: "limited", sections: ["identity", "skills", "credentials"], expiresInHours: 24, oneTime: true, maxUses: 3 };
}

/** Validates drafts and turns them into create-link requests. */
export function planRecipientLinks(drafts: RecipientDraft[]):
  { ok: true; requests: { label: string; scopes: string[]; expires_in_hours: number; max_uses: number }[] } | { ok: false; error: string } {
  if (drafts.length === 0) return { ok: false, error: "Add at least one recipient." };
  if (drafts.length > 20) return { ok: false, error: "Up to 20 recipients at a time." };
  const names = new Set<string>();
  const requests = [];
  for (const d of drafts) {
    const name = d.name.trim();
    if (!name) return { ok: false, error: "Every recipient needs a name." };
    if (names.has(name.toLowerCase())) return { ok: false, error: `"${name}" is listed twice.` };
    names.add(name.toLowerCase());
    const scopes = d.access === "full" ? [...SHARE_SECTIONS] : d.sections.filter((s) => SHARE_SECTIONS.includes(s));
    if (!scopes.length) return { ok: false, error: `Pick at least one section for ${name}.` };
    requests.push({
      label: `${name} · ${d.access === "full" ? "full read-only" : "limited"}`.slice(0, 120),
      scopes,
      expires_in_hours: Math.min(720, Math.max(1, Math.floor(d.expiresInHours || 24))),
      max_uses: d.oneTime ? 1 : Math.min(50, Math.max(2, Math.floor(d.maxUses || 2))),
    });
  }
  return { ok: true, requests };
}
