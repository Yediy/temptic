// Pure buffering rules for the Live Events stream (newest first).
import type { FabricEvent } from "@/lib/activity/events";

export interface LiveBuffer {
  events: FabricEvent[];
  /** Arrived while paused or while the user is scrolled away; shown on resume. */
  pending: FabricEvent[];
}

const byNewest = (a: FabricEvent, b: FabricEvent) => b.created_at.localeCompare(a.created_at);

function mergeUnique(base: FabricEvent[], add: FabricEvent[], limit: number): FabricEvent[] {
  const seen = new Set<string>();
  const out: FabricEvent[] = [];
  for (const e of [...add, ...base].sort(byNewest)) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    out.push(e);
    if (out.length >= limit) break;
  }
  return out;
}

/** New events go to `pending` when held (paused / scrolled away), else straight into the list. */
export function receive(buf: LiveBuffer, incoming: FabricEvent[], hold: boolean, limit: number): LiveBuffer {
  const known = new Set(buf.events.map((e) => e.id));
  const fresh = incoming.filter((e) => !known.has(e.id));
  if (!fresh.length) return buf;
  if (hold) return { events: buf.events, pending: mergeUnique(buf.pending, fresh, limit) };
  return { events: mergeUnique(buf.events, fresh, limit), pending: buf.pending };
}

/** Moves every held event into the visible list. */
export function flush(buf: LiveBuffer, limit: number): LiveBuffer {
  if (!buf.pending.length) return buf;
  return { events: mergeUnique(buf.events, buf.pending, limit), pending: [] };
}

/** Keeps pinned events (full copies) refreshed with the latest version seen in the stream. */
export function refreshPinned(pinned: FabricEvent[], latest: FabricEvent[]): FabricEvent[] {
  const map = new Map(latest.map((e) => [e.id, e]));
  let changed = false;
  const next = pinned.map((p) => {
    const l = map.get(p.id);
    if (l && l !== p && JSON.stringify(l) !== JSON.stringify(p)) { changed = true; return l; }
    return p;
  });
  return changed ? next : pinned;
}
