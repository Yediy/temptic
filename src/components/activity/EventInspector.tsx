import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  CATEGORY_CLASS,
  CATEGORY_LABEL,
  SEVERITY_CLASS,
  categoryOf,
  durationMs,
  humanizeName,
  processingState,
  severityOf,
  type FabricEvent,
} from "@/lib/activity/events";
import { useRelatedEvents, useSubscribers } from "@/hooks/activity/use-event-fabric";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="break-words font-mono text-xs">{value ?? "—"}</div>
    </div>
  );
}

interface Props {
  event: FabricEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReplay?: (event: FabricEvent) => void;
  onSelectRelated?: (event: FabricEvent) => void;
}

export function EventInspector({ event, open, onOpenChange, onReplay, onSelectRelated }: Props) {
  const { data: related = [] } = useRelatedEvents(open ? event : null);
  const { data: subscribers = [] } = useSubscribers();

  const matching = event
    ? subscribers.filter((s) => {
        const p = s.event_pattern.replace(/\*/g, "");
        return s.event_pattern === "*" || event.name.startsWith(p);
      })
    : [];

  const cat = event ? categoryOf(event) : "system";
  const sev = event ? severityOf(event) : "info";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meta = (event?.metadata ?? {}) as Record<string, any>;
  const woic = meta.woic ?? meta.interpretation ?? null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-hidden p-0 sm:max-w-xl">
        {event && (
          <ScrollArea className="h-full">
            <div className="space-y-5 p-6">
              <SheetHeader className="space-y-2 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn("text-[10px]", CATEGORY_CLASS[cat])}>
                    {CATEGORY_LABEL[cat]}
                  </Badge>
                  <Badge variant="outline" className={cn("text-[10px]", SEVERITY_CLASS[sev])}>
                    {sev}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {processingState(event)}
                  </Badge>
                </div>
                <SheetTitle className="font-mono text-base">{event.name}</SheetTitle>
                <SheetDescription>{humanizeName(event.name)}</SheetDescription>
              </SheetHeader>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Event ID" value={event.id} />
                <Field label="Version" value="v1" />
                <Field label="Origin module" value={event.module} />
                <Field label="Publisher" value={event.actor_id ?? "system"} />
                <Field label="Entity" value={`${event.entity_type ?? "—"} ${event.entity_id?.slice(0, 8) ?? ""}`} />
                <Field label="Correlation / trace" value={event.correlation_id ?? "—"} />
                <Field label="Created" value={format(new Date(event.created_at), "PPpp")} />
                <Field
                  label="Processing time"
                  value={durationMs(event) !== null ? `${durationMs(event)} ms` : "not processed"}
                />
                <Field label="Retry count" value={String(meta.attempts ?? meta.retry_count ?? 0)} />
                <Field label="Security context" value={`agency ${event.agency_id.slice(0, 8)} · rls enforced`} />
              </div>

              <Separator />

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Subscribers ({matching.length})</h3>
                {matching.length === 0 && <p className="text-xs text-muted-foreground">No registered subscribers match this event name.</p>}
                <div className="space-y-1">
                  {matching.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-md border px-2 py-1.5 text-xs">
                      <span className="font-mono">{s.handler_key}</span>
                      <span className="flex items-center gap-2 text-muted-foreground">
                        {s.module}
                        <Badge variant={s.enabled ? "outline" : "secondary"} className="text-[9px]">
                          {s.enabled ? "enabled" : "disabled"}
                        </Badge>
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Affected objects</h3>
                <pre className="max-h-40 overflow-auto rounded-md bg-muted p-3 font-mono text-[11px]">
                  {JSON.stringify(event.related_objects ?? [], null, 2)}
                </pre>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Payload / metadata</h3>
                <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 font-mono text-[11px]">
                  {JSON.stringify(event.metadata ?? {}, null, 2)}
                </pre>
              </section>

              {woic && (
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">WOIC interpretation</h3>
                  <pre className="max-h-52 overflow-auto rounded-md border border-primary/30 bg-primary/5 p-3 font-mono text-[11px]">
                    {typeof woic === "string" ? woic : JSON.stringify(woic, null, 2)}
                  </pre>
                </section>
              )}

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Related events ({related.length})</h3>
                <div className="space-y-1">
                  {related.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => onSelectRelated?.(r)}
                      className="flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-left text-xs hover:bg-accent/40"
                    >
                      <span className="font-mono">{r.name}</span>
                      <span className="text-muted-foreground">{format(new Date(r.created_at), "MMM d HH:mm:ss")}</span>
                    </button>
                  ))}
                  {related.length === 0 && <p className="text-xs text-muted-foreground">No correlated events.</p>}
                </div>
              </section>

              {onReplay && (
                <Button variant="outline" className="w-full" onClick={() => onReplay(event)}>
                  Queue for replay
                </Button>
              )}
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
