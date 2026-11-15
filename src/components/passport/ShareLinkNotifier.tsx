// Real-time owner notices for passport share links: opened / revoked (DB trigger → realtime insert)
// and expired (instant timer while the app is open; hourly server sweep persists the notice).
import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { pendingExpiries } from "@/lib/passport/share-expiry";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export function ShareLinkNotifier() {
  const { user } = useAuth();
  const uid = user?.id;

  useEffect(() => {
    if (!uid) return;
    const channel = supabase
      .channel(`share-notices-${uid}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "passport_share_notifications", filter: `recipient_id=eq.${uid}` },
        (p) => {
          const n = p.new as { id: string; kind: string; title: string; body: string | null };
          const show = n.kind === "revoked" ? toast.warning : n.kind === "expired" ? toast.info : toast.success;
          show(n.title, {
            id: n.kind === "expired" ? `share-expired-${(p.new as { link_id: string }).link_id}` : n.id,
            description: n.body ?? undefined,
            action: { label: "Dismiss", onClick: () => void sb.from("passport_share_notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id) },
          });
        })
      .subscribe();

    const timers: ReturnType<typeof setTimeout>[] = [];
    void (async () => {
      const { data } = await sb.from("passport_sharing")
        .select("id,label,expires_at,revoked_at,used_count,max_uses")
        .eq("created_by", uid).is("revoked_at", null).gt("expires_at", new Date().toISOString());
      const rows = (data ?? []) as { id: string; label: string | null; expires_at: string | null; revoked_at: string | null; used_count: number; max_uses: number }[];
      for (const { id, delay } of pendingExpiries(rows)) {
        const label = rows.find((r) => r.id === id)?.label ?? "Share link";
        timers.push(setTimeout(() => toast.info(`${label} expired`, { id: `share-expired-${id}`, description: "The link can no longer be opened." }), delay));
      }
    })();

    return () => { supabase.removeChannel(channel); timers.forEach(clearTimeout); };
  }, [uid]);

  return null;
}
