import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { EventRow } from "@/components/activity/EventRow";
import { EventInspector } from "@/components/activity/EventInspector";
import { useActivitySubjects, useEntityActivity } from "@/hooks/activity/use-event-fabric";
import type { FabricEvent } from "@/lib/activity/events";

interface Props {
  kind: "client" | "worker";
  title: string;
  description: string;
}

export function SubjectActivity({ kind, title, description }: Props) {
  const { data: subjects } = useActivitySubjects();
  const list = (kind === "client" ? subjects?.clients : subjects?.workers) ?? [];
  const [q, setQ] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selected, setSelected] = useState<FabricEvent | null>(null);

  useEffect(() => {
    if (!activeId && list.length) setActiveId(list[0].id);
  }, [list, activeId]);

  const { data: events = [], isLoading } = useEntityActivity(null, activeId);
  const filteredSubjects = list.filter((s) => s.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card className="h-fit">
        <CardHeader className="space-y-2 pb-3">
          <CardTitle className="text-sm">{title}</CardTitle>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="h-8" />
        </CardHeader>
        <CardContent className="p-2">
          <ScrollArea className="h-[62vh]">
            <div className="space-y-0.5 pr-2">
              {filteredSubjects.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveId(s.id)}
                  className={cn(
                    "w-full truncate rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                    activeId === s.id ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-accent/40",
                  )}
                >
                  {s.label}
                </button>
              ))}
              {filteredSubjects.length === 0 && <p className="p-2 text-xs text-muted-foreground">Nothing found.</p>}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base">{list.find((l) => l.id === activeId)?.label ?? "Select a record"}</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          </div>
          <Badge variant="outline" className="text-[10px]">{events.length} events</Badge>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[62vh] rounded-lg border">
            <div className="space-y-1 p-2">
              {isLoading && <p className="py-10 text-center text-sm text-muted-foreground">Loading timeline…</p>}
              {events.map((e) => (
                <EventRow key={e.id} event={e} onSelect={setSelected} selected={selected?.id === e.id} />
              ))}
              {!isLoading && events.length === 0 && (
                <p className="py-16 text-center text-sm text-muted-foreground">No fabric events recorded for this record yet.</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <EventInspector event={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} onSelectRelated={setSelected} />
    </div>
  );
}

export function OrganizationActivity() {
  return (
    <SubjectActivity
      kind="client"
      title="Organizations"
      description="Hiring, assignments, payroll, compliance, documents, approvals and AI recommendations."
    />
  );
}

export function WorkerActivity() {
  return (
    <SubjectActivity
      kind="worker"
      title="Workers"
      description="Applied, hired, assigned, check-ins, training, certifications, passport and twin updates."
    />
  );
}
