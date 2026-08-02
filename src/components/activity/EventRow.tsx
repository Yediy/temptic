import { memo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Pin, PinOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  CATEGORY_CLASS,
  CATEGORY_LABEL,
  SEVERITY_CLASS,
  categoryOf,
  durationMs,
  humanizeName,
  priorityOf,
  processingState,
  severityOf,
  type FabricEvent,
} from "@/lib/activity/events";

interface Props {
  event: FabricEvent;
  onSelect?: (e: FabricEvent) => void;
  pinned?: boolean;
  onTogglePin?: (id: string) => void;
  selected?: boolean;
  dense?: boolean;
}

export const EventRow = memo(function EventRow({ event, onSelect, pinned, onTogglePin, selected, dense }: Props) {
  const cat = categoryOf(event);
  const sev = severityOf(event);
  const state = processingState(event);
  const ms = durationMs(event);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(event)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(event);
        }
      }}
      className={cn(
        "group flex w-full items-start gap-3 rounded-lg border bg-card/60 px-3 text-left backdrop-blur-sm transition-colors hover:bg-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        dense ? "py-1.5" : "py-2.5",
        selected && "border-primary/60 bg-accent/40",
      )}
    >
      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", sev === "critical" ? "bg-destructive" : sev === "warning" ? "bg-primary" : "bg-muted-foreground/50")} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{event.name}</code>
          <Badge variant="outline" className={cn("h-4 px-1 text-[9px] uppercase tracking-wide", CATEGORY_CLASS[cat])}>
            {CATEGORY_LABEL[cat]}
          </Badge>
          <Badge variant="outline" className={cn("h-4 px-1 text-[9px]", SEVERITY_CLASS[sev])}>
            {priorityOf(event)}
          </Badge>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{state}</span>
        </div>
        {!dense && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {humanizeName(event.name)}
            {event.entity_type ? ` · ${event.entity_type}` : ""}
            {event.entity_id ? ` ${event.entity_id.slice(0, 8)}` : ""}
            {event.correlation_id ? ` · trace ${event.correlation_id.slice(0, 8)}` : ""}
          </p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className="font-mono text-[11px] text-muted-foreground">{format(new Date(event.created_at), "HH:mm:ss")}</p>
        <p className="text-[10px] text-muted-foreground">
          {ms !== null ? `${ms} ms` : formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
        </p>
      </div>
      {onTogglePin && (
        <button
          type="button"
          aria-label={pinned ? "Unpin event" : "Pin event"}
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(event.id);
          }}
          className="mt-0.5 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus:opacity-100 group-hover:opacity-100 data-[pinned=true]:opacity-100"
          data-pinned={pinned}
        >
          {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );
});
