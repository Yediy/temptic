import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";

type CalRow = {
  id: string;
  kind: string;
  start_at: string;
  end_at: string;
  title: string;
  entity_type: string;
  entity_id: string;
};

const KINDS: CalRow["kind"][] = ["shift", "credential_expiry", "training_due", "ticket_work_date"];

export default function Calendar() {
  const [anchor, setAnchor] = useState(new Date());
  const [rows, setRows] = useState<CalRow[]>([]);
  const [active, setActive] = useState<Set<string>>(new Set(KINDS));

  useEffect(() => {
    const from = startOfMonth(anchor).toISOString();
    const to = endOfMonth(anchor).toISOString();
    (async () => {
      const { data } = await supabase
        .from("ttos_calendar")
        .select("*")
        .gte("start_at", from)
        .lte("start_at", to)
        .order("start_at");
      setRows((data ?? []) as CalRow[]);
    })();
  }, [anchor]);

  const visible = rows.filter((r) => active.has(r.kind));

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setAnchor((a) => subMonths(a, 1))}>Prev</Button>
          <span className="min-w-[9rem] text-center font-medium">{format(anchor, "MMMM yyyy")}</span>
          <Button size="sm" variant="outline" onClick={() => setAnchor((a) => addMonths(a, 1))}>Next</Button>
          <Button size="sm" variant="ghost" onClick={() => setAnchor(new Date())}>Today</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <Button
            key={k}
            size="sm"
            variant={active.has(k) ? "default" : "outline"}
            onClick={() => {
              const n = new Set(active);
              n.has(k) ? n.delete(k) : n.add(k);
              setActive(n);
            }}
          >
            {k.replace(/_/g, " ")}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>{visible.length} events</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {visible.map((r) => (
            <div key={`${r.entity_type}-${r.id}`} className="flex items-center justify-between border-b pb-2 last:border-0">
              <div>
                <div className="font-medium">{r.title}</div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(r.start_at), "PP p")}
                </div>
              </div>
              <Badge variant="outline">{r.kind.replace(/_/g, " ")}</Badge>
            </div>
          ))}
          {visible.length === 0 && <p className="text-sm text-muted-foreground">Nothing scheduled.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
