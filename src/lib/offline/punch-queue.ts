// Offline-first punch queue. Every worker punch is written to IndexedDB first,
// then synced to the server. Each punch carries a client_event_id so retries
// are idempotent server-side, and the original capture time is preserved.
import { supabase } from "@/integrations/supabase/client";

export type PunchKind = "clock_in" | "clock_out" | "break_start" | "break_end";

export type QueuedPunch = {
  client_event_id: string;
  time_ticket_id: string;
  kind: PunchKind;
  source: string;
  site_id?: string;
  occurred_at: string;
  latitude?: number;
  longitude?: number;
  accuracy_m?: number;
  photo?: Blob;
  photo_path?: string;
  attempts: number;
  last_error?: string;
  failed?: boolean; // permanently rejected by server
};

const DB = "temptic-offline";
const STORE = "punches";
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
export const onQueueChange = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "client_event_id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const r = fn(db.transaction(STORE, mode).objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export const listQueued = () => tx<QueuedPunch[]>("readonly", (s) => s.getAll() as IDBRequest<QueuedPunch[]>)
  .then((rows) => rows.sort((a, b) => a.occurred_at.localeCompare(b.occurred_at)));
const put = (p: QueuedPunch) => tx("readwrite", (s) => s.put(p));
const remove = (id: string) => tx("readwrite", (s) => s.delete(id));
export const discardQueued = async (id: string) => { await remove(id); notify(); };

export async function capturePunch(input: Omit<QueuedPunch, "client_event_id" | "occurred_at" | "attempts">) {
  const p: QueuedPunch = { ...input, client_event_id: crypto.randomUUID(), occurred_at: new Date().toISOString(), attempts: 0 };
  await put(p);
  notify();
  if (navigator.onLine) void syncQueue();
  return p;
}

let syncing: Promise<{ synced: number; failed: number }> | null = null;

export function syncQueue() {
  if (!syncing) syncing = doSync().finally(() => { syncing = null; notify(); });
  return syncing;
}

async function doSync() {
  let synced = 0, failed = 0;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { synced, failed };

  for (const p of await listQueued()) {
    if (p.failed) continue;
    if (!navigator.onLine) break;
    try {
      if (p.photo && !p.photo_path) {
        const path = `${user.id}/${p.time_ticket_id}/${p.client_event_id}.jpg`;
        const { error } = await supabase.storage.from("punch-photos").upload(path, p.photo, { contentType: p.photo.type || "image/jpeg", upsert: false });
        if (error && !/exists|duplicate/i.test(error.message)) throw error;
        p.photo_path = path;
        await put(p);
      }
      const { photo: _photo, attempts: _a, last_error: _e, failed: _f, ...body } = p;
      const { error } = await supabase.functions.invoke("tto-clock", { body: { ...body, offline_capture: true } });
      if (error) {
        const status = (error as { context?: Response }).context?.status ?? 0;
        let msg = error.message;
        try { msg = (await (error as { context: Response }).context.json()).error ?? msg; } catch { /* ignore */ }
        if (status >= 400 && status < 500 && status !== 401 && status !== 429) {
          await put({ ...p, failed: true, last_error: msg, attempts: p.attempts + 1 });
          failed++;
          continue;
        }
        throw new Error(msg);
      }
      await remove(p.client_event_id);
      synced++;
    } catch (e) {
      await put({ ...p, attempts: p.attempts + 1, last_error: e instanceof Error ? e.message : String(e) });
      break; // keep ordering: stop and retry later
    }
  }
  return { synced, failed };
}

export function startAutoSync() {
  const run = () => { if (navigator.onLine) void syncQueue(); };
  window.addEventListener("online", run);
  const t = window.setInterval(run, 60_000);
  run();
  return () => { window.removeEventListener("online", run); window.clearInterval(t); };
}
