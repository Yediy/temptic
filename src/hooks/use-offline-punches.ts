import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { listQueued, onQueueChange, startAutoSync, syncQueue, type QueuedPunch } from "@/lib/offline/punch-queue";

export function useOfflinePunches() {
  const qc = useQueryClient();
  const [queue, setQueue] = useState<QueuedPunch[]>([]);
  const [online, setOnline] = useState(navigator.onLine);

  const refresh = useCallback(async () => {
    const rows = await listQueued().catch(() => []);
    setQueue((prev) => {
      if (prev.length > rows.length) {
        qc.invalidateQueries({ queryKey: ["tto-tickets"] });
        qc.invalidateQueries({ queryKey: ["worker-checkin"] });
      }
      return rows;
    });
  }, [qc]);

  useEffect(() => {
    void refresh();
    const off = onQueueChange(refresh);
    const up = () => setOnline(true), down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { off(); window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, [refresh]);

  return { queue, online, pending: queue.filter((q) => !q.failed), failed: queue.filter((q) => q.failed), syncNow: syncQueue };
}

/** Mount once (worker layout) to sync on reconnect and every minute. */
export function useOfflineAutoSync() {
  useEffect(() => startAutoSync(), []);
}
