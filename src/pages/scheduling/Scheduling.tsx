import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Shift = any;

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function Scheduling() {
  const { agencyId } = useAuth();
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));
  const weekStart = anchor;
  const weekEnd = new Date(anchor); weekEnd.setDate(weekEnd.getDate() + 7);

  const { data: shifts, isLoading, error } = useQuery({
    queryKey: ["shifts", agencyId, weekStart.toISOString()],
    enabled: !!agencyId,
    queryFn: async (): Promise<Shift[]> => {
      const { data, error } = await supabase
        .from("shifts" as never)
        .select("*")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .eq("agency_id" as any, agencyId!)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .gte("starts_at" as any, weekStart.toISOString())
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .lt("starts_at" as any, weekEnd.toISOString())
        .order("starts_at" as never);
      if (error) throw error;
      return (data ?? []) as Shift[];
    },
  });

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i); return d;
  });

  const shiftsByDay: Record<string, Shift[]> = {};
  (shifts ?? []).forEach((s: Shift) => {
    const key = new Date(s.starts_at).toDateString();
    (shiftsByDay[key] ||= []).push(s);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarRange className="h-5 w-5" /> Scheduling</h1>
          <p className="text-sm text-muted-foreground">Weekly view of shifts across all job orders.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => { const d = new Date(anchor); d.setDate(d.getDate() - 7); setAnchor(d); }}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="text-sm font-medium min-w-[10rem] text-center">
            {weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} –{" "}
            {new Date(weekEnd.getTime() - 86400000).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </div>
          <Button variant="outline" size="icon" onClick={() => { const d = new Date(anchor); d.setDate(d.getDate() + 7); setAnchor(d); }}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(startOfWeek(new Date()))}>Today</Button>
        </div>
      </div>

      {error && <div className="text-sm text-destructive">Failed to load shifts: {String(error)}</div>}

      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {days.map((d) => {
          const key = d.toDateString();
          const list = shiftsByDay[key] ?? [];
          return (
            <Card key={key} className="p-3 min-h-[8rem]">
              <div className="text-xs font-semibold text-muted-foreground mb-2">
                {d.toLocaleDateString(undefined, { weekday: "short" })} {d.getDate()}
              </div>
              {isLoading && <div className="text-xs text-muted-foreground">…</div>}
              {!isLoading && list.length === 0 && <div className="text-xs text-muted-foreground">No shifts</div>}
              <div className="space-y-1">
                {list.map((s: Shift) => (
                  <div key={s.id} className="text-xs p-2 rounded bg-primary/5 border border-primary/20">
                    <div className="font-medium truncate">{s.role_label ?? "Shift"}</div>
                    <div className="text-muted-foreground">
                      {new Date(s.starts_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    </div>
                    {s.status && <Badge variant="outline" className="mt-1">{s.status}</Badge>}
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
