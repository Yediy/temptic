import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

type N = {
  id: string;
  title: string;
  body: string | null;
  level: string;
  read_at: string | null;
  created_at: string;
};

const LEVELS = ["all", "critical", "high", "medium", "low"] as const;

export default function NotificationsInbox() {
  const { agencyId, user } = useAuth();
  const [rows, setRows] = useState<N[]>([]);
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("all");

  async function load() {
    if (!agencyId || !user) return;
    let q = supabase
      .from("ttos_notifications" as Any)
      .select("id,title,body,level,read_at,created_at")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (level !== "all") q = q.eq("level", level);
    const { data } = await q;
    setRows(((data ?? []) as unknown) as N[]);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [agencyId, user, level]);

  async function markRead(id: string) {
    await supabase.from("ttos_notifications" as Any).update({ read_at: new Date().toISOString() } as Any).eq("id", id);
    load();
  }

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Notifications</h1>
      <div className="flex flex-wrap gap-2">
        {LEVELS.map((l) => (
          <Button key={l} size="sm" variant={level === l ? "default" : "outline"} onClick={() => setLevel(l)}>
            {l}
          </Button>
        ))}
      </div>
      <div className="space-y-2">
        {rows.map((n) => (
          <Card key={n.id} className={n.read_at ? "opacity-70" : ""}>
            <CardContent className="flex items-start justify-between gap-3 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{n.title}</span>
                  <Badge variant="outline">{n.level}</Badge>
                </div>
                {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </p>
              </div>
              {!n.read_at && <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>Mark read</Button>}
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No notifications.</p>}
      </div>
    </div>
  );
}
